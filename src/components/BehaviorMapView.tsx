import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { DiagnosticViewModel, EntitySummaryViewModel, PathDerivedEntityIndex, PathDerivedEntitySelection, SemanticReferenceIndexViewModel } from '../core';
import { createBehaviorMapGraph, parseBehaviorMapRef, type BehaviorMapNode } from '../model-map/behaviorMapGraph';
import { edgeEndpoints, layoutBehaviorMapGraph, type BehaviorMapLayout, type BehaviorMapLayoutEdge, type BehaviorMapLayoutNode } from '../model-map/behaviorMapLayout';

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;
const FIT_TRANSITION_MS = 250;

type ViewportSize = { readonly width: number; readonly height: number };
type PositionSnapshot = { readonly x: number; readonly y: number; readonly vx?: number; readonly vy?: number };
type TooltipState = { readonly nodeId: string; readonly x: number; readonly y: number };

export function BehaviorMapView({
  entityIndex,
  entitySummaries,
  referenceIndex,
  diagnostics,
  selectedEntity,
  manifestId,
  onSelectEntity,
}: {
  readonly entityIndex: PathDerivedEntityIndex | undefined;
  readonly entitySummaries?: readonly EntitySummaryViewModel[];
  readonly referenceIndex?: SemanticReferenceIndexViewModel;
  readonly diagnostics?: readonly DiagnosticViewModel[];
  readonly selectedEntity: PathDerivedEntitySelection;
  readonly manifestId?: string;
  readonly onSelectEntity: (selection: PathDerivedEntitySelection) => void;
}) {
  const [expandedNodeIds, setExpandedNodeIds] = useState<ReadonlySet<string>>(() => new Set());
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>();
  const [viewport, setViewport] = useState<ViewportSize>({ width: 1, height: 1 });
  const [isViewAnimating, setViewAnimating] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string>();
  const [tooltip, setTooltip] = useState<TooltipState>();
  const canvasFrameRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<SVGSVGElement | null>(null);
  const previousPositionsRef = useRef(new Map<string, PositionSnapshot>());
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const layoutAnimationFrame = useRef<number | undefined>(undefined);
  const viewAnimationTimer = useRef<number | undefined>(undefined);
  const tooltipTimer = useRef<number | undefined>(undefined);
  const [renderedLayout, setRenderedLayout] = useState<BehaviorMapLayout>();

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current = pan; }, [pan]);

  useLayoutEffect(() => {
    const element = canvasFrameRef.current;
    if (!element) return;
    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setViewport({ width: Math.max(1, rect.width), height: Math.max(1, rect.height) });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const graph = useMemo(
    () => entityIndex ? createBehaviorMapGraph({ entityIndex, entitySummaries, referenceIndex, diagnostics, expansion: { expandedNodeIds }, manifestId }) : { nodes: [], edges: [] },
    [diagnostics, entityIndex, entitySummaries, expandedNodeIds, manifestId, referenceIndex],
  );
  const layout = useMemo(
    () => layoutBehaviorMapGraph(graph, { width: viewport.width, height: viewport.height, previousPositions: previousPositionsRef.current }),
    [graph, viewport.height, viewport.width],
  );
  const activeLayout = renderedLayout ?? layout;
  const hoverNeighborhood = useMemo(() => {
    const neighborsByNode = new Map<string, Set<string>>();
    const childrenByNode = new Map<string, Set<string>>();
    const edgeIdsByNode = new Map<string, Set<string>>();
    for (const edge of activeLayout.edges) {
      if (!neighborsByNode.has(edge.source)) neighborsByNode.set(edge.source, new Set());
      if (!neighborsByNode.has(edge.target)) neighborsByNode.set(edge.target, new Set());
      if (!childrenByNode.has(edge.source)) childrenByNode.set(edge.source, new Set());
      if (!edgeIdsByNode.has(edge.source)) edgeIdsByNode.set(edge.source, new Set());
      if (!edgeIdsByNode.has(edge.target)) edgeIdsByNode.set(edge.target, new Set());
      neighborsByNode.get(edge.source)?.add(edge.target);
      neighborsByNode.get(edge.target)?.add(edge.source);
      childrenByNode.get(edge.source)?.add(edge.target);
      edgeIdsByNode.get(edge.source)?.add(edge.id);
      edgeIdsByNode.get(edge.target)?.add(edge.id);
    }
    return { neighborsByNode, childrenByNode, edgeIdsByNode };
  }, [activeLayout.edges]);
  const selectedVisualNodeIds = useMemo(
    () => new Set(activeLayout.nodes.filter((node) => isSelected(node, selectedEntity)).map((node) => node.id)),
    [activeLayout.nodes, selectedEntity],
  );

  useEffect(() => {
    if (layoutAnimationFrame.current !== undefined) window.cancelAnimationFrame(layoutAnimationFrame.current);
    setViewAnimating(true);
    const previous = renderedLayout ?? layout;
    const startedAt = performance.now();
    const duration = 280;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = easeOutCubic(progress);
      const next = interpolateLayout(previous, layout, eased);
      setRenderedLayout(next);
      previousPositionsRef.current = new Map(next.nodes.map((node) => [node.id, { x: node.x, y: node.y }]));
      if (progress < 1) {
        layoutAnimationFrame.current = window.requestAnimationFrame(tick);
      } else {
        setViewAnimating(false);
        layoutAnimationFrame.current = undefined;
      }
    };
    layoutAnimationFrame.current = window.requestAnimationFrame(tick);
    return () => {
      if (layoutAnimationFrame.current !== undefined) window.cancelAnimationFrame(layoutAnimationFrame.current);
    };
  }, [layout]);

  useEffect(() => () => window.clearTimeout(tooltipTimer.current), []);

  const setViewTransform = useCallback((nextZoom: number, nextPan: { x: number; y: number }, animate = false) => {
    const clampedZoom = clampZoom(nextZoom);
    if (animate) {
      window.clearTimeout(viewAnimationTimer.current);
      setViewAnimating(true);
      viewAnimationTimer.current = window.setTimeout(() => setViewAnimating(false), FIT_TRANSITION_MS);
    }
    setZoom(clampedZoom);
    setPan(nextPan);
  }, []);

  const zoomAroundPoint = useCallback((nextZoom: number, point: { x: number; y: number }) => {
    const currentZoom = zoomRef.current;
    const currentPan = panRef.current;
    const clampedZoom = clampZoom(nextZoom);
    const graphPoint = { x: (point.x - currentPan.x) / currentZoom, y: (point.y - currentPan.y) / currentZoom };
    setViewTransform(clampedZoom, { x: point.x - graphPoint.x * clampedZoom, y: point.y - graphPoint.y * clampedZoom });
  }, [setViewTransform]);

  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const rect = element.getBoundingClientRect();
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const factor = Math.exp(-event.deltaY * 0.0016);
      zoomAroundPoint(zoomRef.current * factor, point);
    };
    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, [zoomAroundPoint]);

  if (!entityIndex) {
    return <section className="behavior-map-empty"><h2>Behavior Map</h2><p>Load a workspace to explore semantic areas, workflows, and capabilities.</p></section>;
  }

  function toggleNode(node: BehaviorMapNode) {
    if (node.kind === 'capability' || node.kind === 'event' || node.kind === 'entity' || node.kind === 'state-machine' || node.kind === 'decision' || node.kind === 'manifest') return;
    setExpandedNodeIds((current) => {
      const next = new Set(current);
      if (next.has(node.canonicalId)) next.delete(node.canonicalId);
      else next.add(node.canonicalId);
      return next;
    });
  }

  function selectNode(node: BehaviorMapNode) {
    const ref = parseBehaviorMapRef(node.ref);
    if (!ref || ref.scope === 'manifest') return;
    onSelectEntity({ scope: ref.scope as never, identity: ref.identity });
  }

  function expandSelected() {
    const node = activeLayout.nodes.find((candidate) => isSelected(candidate, selectedEntity));
    if (node) toggleNode(node);
  }

  function expandOneLevel() {
    setExpandedNodeIds((current) => {
      const next = new Set(current);
      for (const node of activeLayout.nodes) {
        if (node.kind === 'semantic-area' || node.kind === 'workflow' || node.kind === 'aggregated-workflow') next.add(node.canonicalId);
      }
      return next;
    });
  }

  function zoomAroundCenter(nextZoom: number) {
    zoomAroundPoint(nextZoom, { x: viewport.width / 2, y: viewport.height / 2 });
  }

  function zoomIn() {
    zoomAroundCenter(zoom * 1.18);
  }

  function zoomOut() {
    zoomAroundCenter(zoom / 1.18);
  }

  function fitToView() {
    if (!activeLayout.nodes.length) {
      resetView();
      return;
    }

    const padding = 96;
    const bounds = activeLayout.nodes.reduce(
      (current, node) => {
        const halfWidth = node.width / 2;
        const halfHeight = node.height / 2;
        return {
          minX: Math.min(current.minX, node.x - halfWidth),
          maxX: Math.max(current.maxX, node.x + halfWidth),
          minY: Math.min(current.minY, node.y - halfHeight),
          maxY: Math.max(current.maxY, node.y + halfHeight),
        };
      },
      { minX: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY },
    );
    const graphWidth = Math.max(1, bounds.maxX - bounds.minX);
    const graphHeight = Math.max(1, bounds.maxY - bounds.minY);
    const usableWidth = Math.max(1, viewport.width - padding * 2);
    const usableHeight = Math.max(1, viewport.height - padding * 2);
    const nextZoom = clampZoom(Math.min(usableWidth / graphWidth, usableHeight / graphHeight));
    const graphCenter = { x: bounds.minX + graphWidth / 2, y: bounds.minY + graphHeight / 2 };
    setViewTransform(nextZoom, { x: viewport.width / 2 - graphCenter.x * nextZoom, y: viewport.height / 2 - graphCenter.y * nextZoom }, true);
  }

  function resetView() {
    setViewTransform(1, { x: 0, y: 0 }, true);
  }

  function expandSemanticAreas() {
    setExpandedNodeIds((current) => new Set([...current, ...graph.nodes.filter((node) => node.kind === 'semantic-area').map((node) => node.canonicalId)]));
  }

  function showTooltip(node: BehaviorMapNode, event: PointerEvent) {
    setHoveredNodeId(node.id);
    window.clearTimeout(tooltipTimer.current);
    tooltipTimer.current = window.setTimeout(() => setTooltip({ nodeId: node.id, ...tooltipPosition(event.clientX, event.clientY) }), 180);
  }

  function moveTooltip(event: PointerEvent) {
    if (!tooltip) return;
    setTooltip((current) => current ? { ...current, ...tooltipPosition(event.clientX, event.clientY) } : current);
  }

  function hideTooltip() {
    window.clearTimeout(tooltipTimer.current);
    setHoveredNodeId(undefined);
    setTooltip(undefined);
  }

  const tooltipNode = tooltip ? activeLayout.nodes.find((node) => node.id === tooltip.nodeId) : undefined;
  const tooltipStyle = tooltip ? { left: tooltip.x, top: tooltip.y } : undefined;

  return (
    <section className="behavior-map-view" aria-labelledby="behavior-map-title">
      <div className="behavior-map-toolbar">
        <div><p className="eyebrow">Map</p><h2 id="behavior-map-title">Behavior Map</h2></div>
        <button type="button" onClick={() => setExpandedNodeIds(new Set())}>Collapse all</button>
        <button type="button" onClick={expandSelected}>Expand selected</button>
        <button type="button" onClick={expandSemanticAreas}>Expand semantic areas</button>
        <button type="button" onClick={expandOneLevel}>Expand one level</button>
      </div>
      <div className="behavior-map-canvas-frame" ref={canvasFrameRef}>
        <div className="behavior-map-navigation-controls" aria-label="Map navigation controls">
          <button type="button" onClick={zoomIn} aria-label="Zoom in">+</button>
          <button type="button" onClick={zoomOut} aria-label="Zoom out">−</button>
          <button type="button" onClick={fitToView}>Fit</button>
          <button type="button" onClick={resetView}>Reset</button>
          <span aria-live="polite">{Math.round(zoom * 100)}%</span>
        </div>
        <p className="behavior-map-pan-hint">Drag empty canvas to pan · scroll to zoom</p>
        <svg
          className={isViewAnimating ? 'behavior-map-canvas behavior-map-canvas--animating' : 'behavior-map-canvas'}
          ref={canvasRef}
          viewBox={`0 0 ${viewport.width} ${viewport.height}`}
          role="img"
          aria-label="Exploratory behavior map"
          onPointerDown={(event) => { if (event.target === event.currentTarget) setDragStart({ x: event.clientX - pan.x, y: event.clientY - pan.y }); }}
          onPointerMove={(event) => { if (dragStart) setPan({ x: event.clientX - dragStart.x, y: event.clientY - dragStart.y }); }}
          onPointerUp={() => setDragStart(undefined)}
          onPointerLeave={() => setDragStart(undefined)}
        >
          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
            {activeLayout.edges.filter((edge) => edge.kind === 'model-reference').map((edge) => <path className={edgeClassName(edge, activeLayout.nodes, selectedEntity, hoveredNodeId, hoverNeighborhood.edgeIdsByNode)} key={edge.id} d={straightPath(edge)} />)}
            {activeLayout.edges.filter((edge) => edge.kind !== 'model-reference').map((edge) => <path className={edgeClassName(edge, activeLayout.nodes, selectedEntity, hoveredNodeId, hoverNeighborhood.edgeIdsByNode)} key={edge.id} d={straightPath(edge)} />)}
            {activeLayout.nodes.map((node) => (
            <g className={nodeClassName(node, selectedVisualNodeIds, hoveredNodeId, hoverNeighborhood.neighborsByNode, hoverNeighborhood.childrenByNode)} key={node.id} transform={`translate(${node.x} ${node.y})`} onPointerEnter={(event) => showTooltip(node, event)} onPointerMove={moveTooltip} onPointerLeave={hideTooltip} onClick={(event) => { event.stopPropagation(); selectNode(node); if (node.kind === 'semantic-area' || node.kind === 'workflow' || node.kind === 'aggregated-workflow') toggleNode(node); }}>
              {node.shape === 'pill' ? <rect className="behavior-map-pill" x={-node.width / 2} y={-node.height / 2} width={node.width} height={node.height} rx={node.height / 2} /> : <circle className="behavior-map-circle" r={node.radius} />}
              <text className="behavior-map-label" textAnchor="middle" dominantBaseline="middle">{node.displayLines.map((line, index) => <tspan key={`${node.id}-label-${index}`} x="0" dy={index === 0 ? labelStartDy(node) : 14}>{line}</tspan>)}{node.kind === 'semantic-area' && !node.expanded ? <tspan x="0" dy="16">{node.sizeWeight} workflows</tspan> : null}{node.workflowSubtype === 'aggregated' ? <tspan className="behavior-map-label-tag" x="0" dy="16">aggregate</tspan> : null}</text>
              {node.diagnostics && (node.diagnostics.errors + node.diagnostics.warnings + node.diagnostics.info > 0) ? <text className="behavior-map-badge" x={node.radius} y={-node.radius}>{node.diagnostics.errors || node.diagnostics.warnings || node.diagnostics.info}</text> : null}
            </g>
            ))}
          </g>
        </svg>
        {tooltipNode && tooltipStyle ? (
          <div className="behavior-map-tooltip" style={tooltipStyle} role="status">
            <strong><span aria-hidden="true">{kindIcon(tooltipNode.kind)}</span>{tooltipNode.label}</strong>
            <span>{formatKind(tooltipNode.kind)}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function isSelected(node: { readonly ref: string }, selected: PathDerivedEntitySelection): boolean {
  const ref = parseBehaviorMapRef(node.ref);
  return Boolean(ref && selected?.scope === ref.scope && selected.identity === ref.identity);
}

function straightPath(edge: BehaviorMapLayoutEdge): string {
  return `M ${edge.sourceX} ${edge.sourceY} L ${edge.targetX} ${edge.targetY}`;
}

function labelStartDy(node: { readonly displayLines: readonly string[] }): number {
  return node.displayLines.length > 1 ? -7 : 0;
}

function nodeClassName(node: BehaviorMapNode & { readonly shape: string; readonly expanded: boolean }, selectedVisualNodeIds: ReadonlySet<string>, hoveredNodeId: string | undefined, neighborsByNode: ReadonlyMap<string, ReadonlySet<string>>, childrenByNode: ReadonlyMap<string, ReadonlySet<string>>): string {
  const isNodeSelected = selectedVisualNodeIds.has(node.id);
  const isHovered = hoveredNodeId === node.id;
  const focusNodeIds = hoveredNodeId ? new Set([hoveredNodeId]) : selectedVisualNodeIds;
  const isNeighbor = [...focusNodeIds].some((focusNodeId) => neighborsByNode.get(focusNodeId)?.has(node.id));
  const isChild = Boolean(hoveredNodeId && childrenByNode.get(hoveredNodeId)?.has(node.id));
  const hasFocus = focusNodeIds.size > 0;
  const isDimmed = Boolean(hasFocus && !isHovered && !isNeighbor && !isNodeSelected);
  return [
    'behavior-map-node',
    `behavior-map-node--${node.kind}`,
    `behavior-map-node--${node.shape}`,
    node.expanded ? 'behavior-map-node--expanded' : undefined,
    node.workflowSubtype ? `behavior-map-node--${node.workflowSubtype}` : undefined,
    isNodeSelected ? 'behavior-map-node--selected' : undefined,
    isHovered ? 'behavior-map-node--hovered' : undefined,
    isNeighbor ? 'behavior-map-node--neighbor' : undefined,
    isChild ? 'behavior-map-node--child' : undefined,
    isDimmed ? 'behavior-map-node--dimmed' : undefined,
  ].filter(Boolean).join(' ');
}

function edgeClassName(edge: BehaviorMapLayoutEdge, nodes: readonly BehaviorMapLayoutNode[], selectedEntity: PathDerivedEntitySelection, hoveredNodeId: string | undefined, edgeIdsByNode: ReadonlyMap<string, ReadonlySet<string>>): string {
  const selectedNodeIds = new Set(nodes.filter((node) => isSelected(node, selectedEntity)).map((node) => node.id));
  const isHoveredConnected = Boolean(hoveredNodeId && edgeIdsByNode.get(hoveredNodeId)?.has(edge.id));
  const isSelectedConnected = edgeIdsByNodeForSet(edgeIdsByNode, selectedNodeIds).has(edge.id);
  const hasFocus = Boolean(hoveredNodeId || selectedNodeIds.size > 0);
  const isFocused = isHoveredConnected || isSelectedConnected;
  return ['behavior-map-edge', `behavior-map-edge--${edge.kind}`, isFocused ? 'behavior-map-edge--highlighted' : undefined, hasFocus && !isFocused ? 'behavior-map-edge--dimmed' : undefined].filter(Boolean).join(' ');
}

function edgeIdsByNodeForSet(edgeIdsByNode: ReadonlyMap<string, ReadonlySet<string>>, nodeIds: ReadonlySet<string>): ReadonlySet<string> {
  const result = new Set<string>();
  for (const nodeId of nodeIds) for (const edgeId of edgeIdsByNode.get(nodeId) ?? []) result.add(edgeId);
  return result;
}

function tooltipPosition(clientX: number, clientY: number) {
  const width = 220;
  const height = 72;
  return { x: Math.min(window.innerWidth - width - 12, clientX + 16), y: Math.min(window.innerHeight - height - 12, clientY + 16) };
}

function formatKind(kind: string): string {
  return kind.replace(/-/g, ' ');
}

function kindIcon(kind: string): string {
  if (kind === 'manifest') return '✦ ';
  if (kind === 'semantic-area') return '◉ ';
  if (kind === 'aggregated-workflow') return '⬡ ';
  if (kind === 'workflow') return '◇ ';
  if (kind === 'capability') return '◆ ';
  return '• ';
}

function interpolateLayout(from: BehaviorMapLayout, to: BehaviorMapLayout, progress: number): BehaviorMapLayout {
  const previousById = new Map(from.nodes.map((node) => [node.id, node]));
  const nodes = to.nodes.map((node) => {
    const previous = previousById.get(node.id);
    return previous ? { ...node, x: lerp(previous.x, node.x, progress), y: lerp(previous.y, node.y, progress) } : node;
  });
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const edges = to.edges.flatMap((edge) => {
    const source = nodesById.get(edge.source);
    const target = nodesById.get(edge.target);
    return source && target ? [{ ...edge, ...edgeEndpoints(source, target) }] : [];
  });
  return { ...to, nodes, edges };
}

function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

function easeOutCubic(progress: number): number {
  return 1 - Math.pow(1 - progress, 3);
}
