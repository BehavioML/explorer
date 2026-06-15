import { useMemo, useState } from 'react';
import type { DiagnosticViewModel, EntitySummaryViewModel, PathDerivedEntityIndex, PathDerivedEntitySelection, SemanticReferenceIndexViewModel } from '../core';
import { createBehaviorMapGraph, parseBehaviorMapRef, type BehaviorMapNode } from '../model-map/behaviorMapGraph';
import { layoutBehaviorMapGraph, type BehaviorMapLayoutEdge } from '../model-map/behaviorMapLayout';

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

  const graph = useMemo(
    () => entityIndex ? createBehaviorMapGraph({ entityIndex, entitySummaries, referenceIndex, diagnostics, expansion: { expandedNodeIds }, manifestId }) : { nodes: [], edges: [] },
    [diagnostics, entityIndex, entitySummaries, expandedNodeIds, manifestId, referenceIndex],
  );
  const layout = useMemo(() => layoutBehaviorMapGraph(graph), [graph]);

  if (!entityIndex) {
    return <section className="behavior-map-empty"><h2>Behavior Map</h2><p>Load a workspace to explore semantic areas, workflows, and capabilities.</p></section>;
  }

  function toggleNode(node: BehaviorMapNode) {
    if (node.kind === 'capability' || node.kind === 'event' || node.kind === 'entity' || node.kind === 'state-machine' || node.kind === 'decision' || node.kind === 'manifest') return;
    setExpandedNodeIds((current) => {
      const next = new Set(current);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      return next;
    });
  }

  function selectNode(node: BehaviorMapNode) {
    const ref = parseBehaviorMapRef(node.ref);
    if (!ref || ref.scope === 'manifest') return;
    onSelectEntity({ scope: ref.scope as never, identity: ref.identity });
  }

  function expandSelected() {
    const node = layout.nodes.find((candidate) => isSelected(candidate, selectedEntity));
    if (node) toggleNode(node);
  }

  function expandOneLevel() {
    setExpandedNodeIds((current) => {
      const next = new Set(current);
      for (const node of layout.nodes) {
        if (node.kind === 'semantic-area' || node.kind === 'workflow' || node.kind === 'aggregated-workflow') next.add(node.id);
      }
      return next;
    });
  }

  function zoomAroundCenter(nextZoom: number) {
    const clampedZoom = Math.min(2.5, Math.max(0.35, nextZoom));
    const center = { x: layout.width / 2, y: layout.height / 2 };
    const graphCenter = { x: (center.x - pan.x) / zoom, y: (center.y - pan.y) / zoom };
    setZoom(clampedZoom);
    setPan({ x: center.x - graphCenter.x * clampedZoom, y: center.y - graphCenter.y * clampedZoom });
  }

  function zoomIn() {
    zoomAroundCenter(zoom + 0.15);
  }

  function zoomOut() {
    zoomAroundCenter(zoom - 0.15);
  }

  function fitToView() {
    if (!layout.nodes.length) {
      resetView();
      return;
    }

    const padding = 96;
    const bounds = layout.nodes.reduce(
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
    const nextZoom = Math.min(2.5, Math.max(0.35, Math.min((layout.width - padding * 2) / graphWidth, (layout.height - padding * 2) / graphHeight)));
    const graphCenter = { x: bounds.minX + graphWidth / 2, y: bounds.minY + graphHeight / 2 };
    setZoom(nextZoom);
    setPan({ x: layout.width / 2 - graphCenter.x * nextZoom, y: layout.height / 2 - graphCenter.y * nextZoom });
  }

  function resetView() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function expandSemanticAreas() {
    setExpandedNodeIds((current) => new Set([...current, ...graph.nodes.filter((node) => node.kind === 'semantic-area').map((node) => node.id)]));
  }

  return (
    <section className="behavior-map-view" aria-labelledby="behavior-map-title">
      <div className="behavior-map-toolbar">
        <div><p className="eyebrow">Map</p><h2 id="behavior-map-title">Behavior Map</h2></div>
        <button type="button" onClick={() => setExpandedNodeIds(new Set())}>Collapse all</button>
        <button type="button" onClick={expandSelected}>Expand selected</button>
        <button type="button" onClick={expandSemanticAreas}>Expand semantic areas</button>
        <button type="button" onClick={expandOneLevel}>Expand one level</button>
      </div>
      <div className="behavior-map-canvas-frame">
        <div className="behavior-map-navigation-controls" aria-label="Map navigation controls">
          <button type="button" onClick={zoomIn} aria-label="Zoom in">+</button>
          <button type="button" onClick={zoomOut} aria-label="Zoom out">−</button>
          <button type="button" onClick={fitToView}>Fit</button>
          <button type="button" onClick={resetView}>Reset</button>
          <span aria-live="polite">{Math.round(zoom * 100)}%</span>
        </div>
        <p className="behavior-map-pan-hint">Drag empty canvas to pan · scroll to zoom</p>
        <svg
          className="behavior-map-canvas"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role="img"
          aria-label="Exploratory behavior map"
          onWheel={(event) => { event.preventDefault(); zoomAroundCenter(zoom + (event.deltaY < 0 ? 0.08 : -0.08)); }}
          onPointerDown={(event) => { if (event.target === event.currentTarget) setDragStart({ x: event.clientX - pan.x, y: event.clientY - pan.y }); }}
          onPointerMove={(event) => { if (dragStart) setPan({ x: event.clientX - dragStart.x, y: event.clientY - dragStart.y }); }}
          onPointerUp={() => setDragStart(undefined)}
          onPointerLeave={() => setDragStart(undefined)}
        >
          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
            {layout.edges.map((edge) => <path className={`behavior-map-edge behavior-map-edge--${edge.kind}`} key={edge.id} d={curvedPath(edge)} />)}
            {layout.nodes.map((node) => (
            <g className={`behavior-map-node behavior-map-node--${node.kind} behavior-map-node--${node.shape} ${node.expanded ? 'behavior-map-node--expanded' : ''} ${node.workflowSubtype ? `behavior-map-node--${node.workflowSubtype}` : ''} ${isSelected(node, selectedEntity) ? 'behavior-map-node--selected' : ''}`} key={node.id} transform={`translate(${node.x} ${node.y})`} onClick={(event) => { event.stopPropagation(); selectNode(node); if (node.kind === 'semantic-area' || node.kind === 'workflow' || node.kind === 'aggregated-workflow') toggleNode(node); }}>
              <title>{node.label} — {node.ref}{node.workflowSubtype === 'aggregated' ? ' (aggregate)' : ''}</title>
              {node.shape === 'pill' ? <rect className="behavior-map-pill" x={-node.width / 2} y={-node.height / 2} width={node.width} height={node.height} rx={node.height / 2} /> : <circle className="behavior-map-circle" r={node.radius} />}
              <text className="behavior-map-label" textAnchor="middle" dominantBaseline="middle">{node.displayLines.map((line, index) => <tspan key={`${node.id}-label-${index}`} x="0" dy={index === 0 ? labelStartDy(node) : 14}>{line}</tspan>)}{node.kind === 'semantic-area' && !node.expanded ? <tspan x="0" dy="16">{node.sizeWeight} workflows</tspan> : null}{node.workflowSubtype === 'aggregated' ? <tspan className="behavior-map-label-tag" x="0" dy="16">aggregate</tspan> : null}</text>
              {node.diagnostics && (node.diagnostics.errors + node.diagnostics.warnings + node.diagnostics.info > 0) ? <text className="behavior-map-badge" x={node.radius} y={-node.radius}>{node.diagnostics.errors || node.diagnostics.warnings || node.diagnostics.info}</text> : null}
            </g>
            ))}
          </g>
        </svg>
      </div>
    </section>
  );
}

function isSelected(node: { readonly ref: string }, selected: PathDerivedEntitySelection): boolean {
  const ref = parseBehaviorMapRef(node.ref);
  return Boolean(ref && selected?.scope === ref.scope && selected.identity === ref.identity);
}

function curvedPath(edge: BehaviorMapLayoutEdge): string {
  const direction = edge.targetX >= edge.sourceX ? 1 : -1;
  const delta = Math.max(80, Math.abs(edge.targetX - edge.sourceX) * 0.55);
  return `M ${edge.sourceX} ${edge.sourceY} C ${edge.sourceX + direction * delta} ${edge.sourceY}, ${edge.targetX - direction * delta} ${edge.targetY}, ${edge.targetX} ${edge.targetY}`;
}

function labelStartDy(node: { readonly displayLines: readonly string[] }): number {
  return node.displayLines.length > 1 ? -7 : 0;
}
