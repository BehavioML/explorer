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
  onSelectEntity,
}: {
  readonly entityIndex: PathDerivedEntityIndex | undefined;
  readonly entitySummaries?: readonly EntitySummaryViewModel[];
  readonly referenceIndex?: SemanticReferenceIndexViewModel;
  readonly diagnostics?: readonly DiagnosticViewModel[];
  readonly selectedEntity: PathDerivedEntitySelection;
  readonly onSelectEntity: (selection: PathDerivedEntitySelection) => void;
}) {
  const [expandedNodeIds, setExpandedNodeIds] = useState<ReadonlySet<string>>(() => new Set());
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>();

  const graph = useMemo(
    () => entityIndex ? createBehaviorMapGraph({ entityIndex, entitySummaries, referenceIndex, diagnostics, expansion: { expandedNodeIds } }) : { nodes: [], edges: [] },
    [diagnostics, entityIndex, entitySummaries, expandedNodeIds, referenceIndex],
  );
  const layout = useMemo(() => layoutBehaviorMapGraph(graph), [graph]);

  if (!entityIndex) {
    return <section className="behavior-map-empty"><h2>Behavior Map</h2><p>Load a workspace to explore semantic areas, workflows, and capabilities.</p></section>;
  }

  function toggleNode(node: BehaviorMapNode) {
    if (node.kind === 'capability') return;
    setExpandedNodeIds((current) => {
      const next = new Set(current);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      return next;
    });
  }

  function selectNode(node: BehaviorMapNode) {
    const ref = parseBehaviorMapRef(node.ref);
    if (!ref) return;
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
        if (node.kind !== 'capability') next.add(node.id);
      }
      return next;
    });
  }

  function fitToView() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function expandSemanticAreas() {
    setExpandedNodeIds((current) => new Set([...current, ...graph.nodes.filter((node) => node.kind === 'semantic-area').map((node) => node.id)]));
  }

  function centerSelected() {
    const node = layout.nodes.find((candidate) => isSelected(candidate, selectedEntity));
    if (node) setPan({ x: layout.width / 2 - node.x * zoom, y: layout.height / 2 - node.y * zoom });
  }

  return (
    <section className="behavior-map-view" aria-labelledby="behavior-map-title">
      <div className="behavior-map-toolbar">
        <div><p className="eyebrow">Map</p><h2 id="behavior-map-title">Behavior Map</h2></div>
        <button type="button" onClick={() => setExpandedNodeIds(new Set())}>Collapse all</button>
        <button type="button" onClick={expandSelected}>Expand selected</button>
        <button type="button" onClick={expandSemanticAreas}>Expand semantic areas</button>
        <button type="button" onClick={expandOneLevel}>Expand one level</button>
        <button type="button" onClick={() => setZoom((value) => Math.max(0.35, value - 0.15))}>−</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom((value) => Math.min(2.5, value + 0.15))}>+</button>
        <button type="button" onClick={fitToView}>Fit to view</button>
        <button type="button" onClick={centerSelected}>Center selected</button>
      </div>
      <svg
        className="behavior-map-canvas"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="img"
        aria-label="Exploratory behavior map"
        onWheel={(event) => { event.preventDefault(); setZoom((value) => Math.min(2.5, Math.max(0.35, value + (event.deltaY < 0 ? 0.08 : -0.08)))); }}
        onPointerDown={(event) => { if (event.target === event.currentTarget) setDragStart({ x: event.clientX - pan.x, y: event.clientY - pan.y }); }}
        onPointerMove={(event) => { if (dragStart) setPan({ x: event.clientX - dragStart.x, y: event.clientY - dragStart.y }); }}
        onPointerUp={() => setDragStart(undefined)}
        onPointerLeave={() => setDragStart(undefined)}
      >
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          {layout.edges.map((edge) => <path className={`behavior-map-edge behavior-map-edge--${edge.kind}`} key={edge.id} d={curvedPath(edge)} />)}
          {layout.nodes.map((node) => (
            <g className={`behavior-map-node behavior-map-node--${node.kind} behavior-map-node--${node.shape} ${node.expanded ? 'behavior-map-node--expanded' : ''} ${node.workflowSubtype ? `behavior-map-node--${node.workflowSubtype}` : ''} ${isSelected(node, selectedEntity) ? 'behavior-map-node--selected' : ''}`} key={node.id} transform={`translate(${node.x} ${node.y})`} onClick={(event) => { event.stopPropagation(); selectNode(node); if (node.kind !== 'capability') toggleNode(node); }}>
              <title>{node.label} — {node.ref}{node.workflowSubtype === 'aggregated' ? ' (aggregate)' : ''}</title>
              {node.shape === 'pill' ? <rect className="behavior-map-pill" x={-node.width / 2} y={-node.height / 2} width={node.width} height={node.height} rx={node.height / 2} /> : <circle className="behavior-map-circle" r={node.radius} />}
              <text className="behavior-map-label" textAnchor="middle" dominantBaseline="middle"><tspan x="0">{node.label}</tspan>{node.kind === 'semantic-area' && !node.expanded ? <tspan x="0" dy="16">{node.sizeWeight} workflows</tspan> : null}{node.workflowSubtype === 'aggregated' ? <tspan className="behavior-map-label-tag" x="0" dy="16">aggregate</tspan> : null}</text>
              {node.diagnostics && (node.diagnostics.errors + node.diagnostics.warnings + node.diagnostics.info > 0) ? <text className="behavior-map-badge" x={node.radius} y={-node.radius}>{node.diagnostics.errors || node.diagnostics.warnings || node.diagnostics.info}</text> : null}
            </g>
          ))}
        </g>
      </svg>
    </section>
  );
}

function isSelected(node: { readonly ref: string }, selected: PathDerivedEntitySelection): boolean {
  const ref = parseBehaviorMapRef(node.ref);
  return Boolean(ref && selected?.scope === ref.scope && selected.identity === ref.identity);
}

function curvedPath(edge: BehaviorMapLayoutEdge): string {
  const delta = Math.max(80, Math.abs(edge.targetX - edge.sourceX) * 0.55);
  return `M ${edge.sourceX} ${edge.sourceY} C ${edge.sourceX + delta} ${edge.sourceY}, ${edge.targetX - delta} ${edge.targetY}, ${edge.targetX} ${edge.targetY}`;
}
