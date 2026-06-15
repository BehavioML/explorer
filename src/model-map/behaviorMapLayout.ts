import type { BehaviorMapEdge, BehaviorMapGraph, BehaviorMapNode } from './behaviorMapGraph';

export interface BehaviorMapLayoutNode extends BehaviorMapNode {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly width: number;
  readonly height: number;
  readonly shape: 'circle' | 'pill';
  readonly expanded: boolean;
  readonly displayLines: readonly string[];
}

export interface BehaviorMapLayoutEdge extends BehaviorMapEdge {
  readonly sourceX: number;
  readonly sourceY: number;
  readonly targetX: number;
  readonly targetY: number;
}

export interface BehaviorMapBounds { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number }

export interface BehaviorMapLayout {
  readonly nodes: readonly BehaviorMapLayoutNode[];
  readonly edges: readonly BehaviorMapLayoutEdge[];
  readonly width: number;
  readonly height: number;
  readonly bounds: BehaviorMapBounds;
}

type ChildPlacement = { childId: string; edge: BehaviorMapEdge };

const ROOT_X = 220;
const ROOT_Y = 180;
const SEMANTIC_AREA_GAP_Y = 190;
const BRANCH_X_GAP = 300;
const PILL_GAP_Y = 58;
const COLUMN_GAP_X = 280;
const WRAP_COUNT = 8;
const BOUNDS_MARGIN = 120;

const EDGE_KIND_PRIORITY: Record<BehaviorMapEdge['kind'], number> = {
  'semantic-area-contains-workflow': 0,
  'aggregated-workflow-contains-workflow': 1,
  'workflow-uses-capability': 2,
};

export function layoutBehaviorMapGraph(graph: BehaviorMapGraph): BehaviorMapLayout {
  const childPlacementsByParent = groupChildPlacementsBySource(graph.edges);
  const positioned = new Map<string, BehaviorMapLayoutNode>();
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const semanticAreas = graph.nodes.filter((node) => node.kind === 'semantic-area').sort(compareByRef);
  const placedNodeIds = new Set<string>();

  semanticAreas.forEach((node, index) => {
    positioned.set(node.id, toLayoutNode(node, ROOT_X, ROOT_Y + index * SEMANTIC_AREA_GAP_Y, hasChildren(node.id, childPlacementsByParent)));
    placedNodeIds.add(node.id);
  });

  for (const area of semanticAreas) {
    placeDescendants(area.id, nodesById, childPlacementsByParent, positioned, placedNodeIds, new Set([area.id]));
  }

  const edges = graph.edges.flatMap((edge) => {
    const source = positioned.get(edge.source);
    const target = positioned.get(edge.target);
    return source && target ? [{ ...edge, ...edgeEndpoints(source, target) }] : [];
  });
  const bounds = computeBounds([...positioned.values()]);

  return {
    nodes: [...positioned.values()].sort((a, b) => a.id.localeCompare(b.id)),
    edges,
    width: Math.ceil(bounds.maxX - Math.min(0, bounds.minX)),
    height: Math.ceil(bounds.maxY - Math.min(0, bounds.minY)),
    bounds,
  };
}

function placeDescendants(
  parentId: string,
  nodesById: ReadonlyMap<string, BehaviorMapNode>,
  childPlacementsByParent: ReadonlyMap<string, readonly ChildPlacement[]>,
  positioned: Map<string, BehaviorMapLayoutNode>,
  placedNodeIds: Set<string>,
  pathNodeIds: ReadonlySet<string>,
) {
  const parent = positioned.get(parentId);
  if (!parent) return;

  const children = (childPlacementsByParent.get(parentId) ?? [])
    .filter((placement) => nodesById.has(placement.childId))
    .sort((a, b) => comparePlacements(a, b, nodesById));
  if (children.length === 0) return;

  const rows = Math.min(WRAP_COUNT, children.length);
  const blockHeight = (rows - 1) * PILL_GAP_Y;
  const newlyPlacedChildIds: string[] = [];

  children.forEach((placement, index) => {
    if (placedNodeIds.has(placement.childId) || pathNodeIds.has(placement.childId)) return;
    const node = nodesById.get(placement.childId);
    if (!node) return;
    const column = Math.floor(index / WRAP_COUNT);
    const row = index % WRAP_COUNT;
    const x = parent.x + BRANCH_X_GAP + column * COLUMN_GAP_X;
    const y = parent.y - blockHeight / 2 + row * PILL_GAP_Y;
    positioned.set(node.id, toLayoutNode(node, x, y, hasChildren(node.id, childPlacementsByParent)));
    placedNodeIds.add(node.id);
    newlyPlacedChildIds.push(node.id);
  });

  for (const childId of newlyPlacedChildIds) {
    placeDescendants(childId, nodesById, childPlacementsByParent, positioned, placedNodeIds, new Set([...pathNodeIds, childId]));
  }
}

function groupChildPlacementsBySource(edges: readonly BehaviorMapEdge[]): Map<string, ChildPlacement[]> {
  const groups = new Map<string, ChildPlacement[]>();
  for (const edge of [...edges].sort(compareEdgesForPlacement)) {
    groups.set(edge.source, [...(groups.get(edge.source) ?? []), { childId: edge.target, edge }]);
  }
  return groups;
}

function toLayoutNode(node: BehaviorMapNode, x: number, y: number, expanded: boolean): BehaviorMapLayoutNode {
  const shape = node.kind === 'semantic-area' ? 'circle' : 'pill';
  const displayLines = labelLines(node);
  const radius = node.kind === 'semantic-area' ? (expanded ? 48 : 64) : 0;
  const width = shape === 'pill' ? (node.kind === 'capability' ? 190 : 220) : radius * 2;
  const height = shape === 'pill' ? (displayLines.length > 1 || node.workflowSubtype === 'aggregated' ? 52 : 44) : radius * 2;
  return { ...node, x: Math.round(x), y: Math.round(y), radius, width, height, shape, expanded, displayLines };
}

function labelLines(node: BehaviorMapNode): readonly string[] {
  if (node.kind === 'semantic-area') return wrapText(node.label, 16, 2);
  const tail = node.label || node.ref.split('/').at(-1) || node.ref;
  return wrapText(tail, node.kind === 'capability' ? 22 : 24, 2);
}

function wrapText(value: string, maxLength: number, maxLines: number): readonly string[] {
  const normalized = value.replace(/[_-]+/g, ' ').trim() || value;
  if (normalized.length <= maxLength) return [normalized];
  const words = normalized.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= maxLength) line = next;
    else {
      if (line) lines.push(line);
      line = word;
    }
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && line) lines.push(line);
  const clipped = lines.slice(0, maxLines);
  const originalText = words.join(' ');
  if (clipped.join(' ').length < originalText.length && clipped.length > 0) clipped[clipped.length - 1] = `${clipped[clipped.length - 1].slice(0, Math.max(1, maxLength - 1))}…`;
  return clipped;
}

function edgeEndpoints(source: BehaviorMapLayoutNode, target: BehaviorMapLayoutNode) {
  const leftToRight = target.x >= source.x;
  const sourceHalfWidth = source.shape === 'pill' ? source.width / 2 : source.radius;
  const targetHalfWidth = target.shape === 'pill' ? target.width / 2 : target.radius;
  return {
    sourceX: source.x + (leftToRight ? sourceHalfWidth : -sourceHalfWidth),
    sourceY: source.y,
    targetX: target.x + (leftToRight ? -targetHalfWidth : targetHalfWidth),
    targetY: target.y,
  };
}

function computeBounds(nodes: readonly BehaviorMapLayoutNode[]): BehaviorMapBounds {
  if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 1400, maxY: 860 };
  return nodes.reduce(
    (bounds, node) => {
      const halfWidth = node.shape === 'pill' ? node.width / 2 : node.radius;
      const halfHeight = node.shape === 'pill' ? node.height / 2 : node.radius;
      return {
        minX: Math.min(bounds.minX, node.x - halfWidth - BOUNDS_MARGIN),
        minY: Math.min(bounds.minY, node.y - halfHeight - BOUNDS_MARGIN),
        maxX: Math.max(bounds.maxX, node.x + halfWidth + BOUNDS_MARGIN),
        maxY: Math.max(bounds.maxY, node.y + halfHeight + BOUNDS_MARGIN),
      };
    },
    { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY },
  );
}

function hasChildren(id: string, childPlacementsByParent: ReadonlyMap<string, readonly ChildPlacement[]>): boolean {
  return Boolean(childPlacementsByParent.get(id)?.length);
}

function comparePlacements(a: ChildPlacement, b: ChildPlacement, nodesById: ReadonlyMap<string, BehaviorMapNode>) {
  return compareEdgesForPlacement(a.edge, b.edge) || (nodesById.get(a.childId)?.ref ?? a.childId).localeCompare(nodesById.get(b.childId)?.ref ?? b.childId);
}

function compareEdgesForPlacement(a: BehaviorMapEdge, b: BehaviorMapEdge) {
  return EDGE_KIND_PRIORITY[a.kind] - EDGE_KIND_PRIORITY[b.kind] || a.source.localeCompare(b.source) || a.target.localeCompare(b.target) || a.id.localeCompare(b.id);
}

function compareByRef(a: BehaviorMapNode, b: BehaviorMapNode) { return a.ref.localeCompare(b.ref); }
