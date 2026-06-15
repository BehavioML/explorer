import type { BehaviorMapEdge, BehaviorMapGraph, BehaviorMapNode } from './behaviorMapGraph';

export interface BehaviorMapLayoutNode extends BehaviorMapNode {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly width: number;
  readonly height: number;
  readonly shape: 'circle' | 'pill';
  readonly expanded: boolean;
}

export interface BehaviorMapLayoutEdge extends BehaviorMapEdge {
  readonly sourceX: number;
  readonly sourceY: number;
  readonly targetX: number;
  readonly targetY: number;
}

export interface BehaviorMapLayout {
  readonly nodes: readonly BehaviorMapLayoutNode[];
  readonly edges: readonly BehaviorMapLayoutEdge[];
  readonly width: number;
  readonly height: number;
}

const CANVAS_WIDTH = 1400;
const CANVAS_HEIGHT = 860;
const AREA_COLUMNS = 3;
const AREA_COLUMN_GAP = 360;
const AREA_ROW_GAP = 260;
const CHILD_X_GAP = 230;
const CHILD_Y_GAP = 64;
const CHILD_WRAP_COUNT = 8;

export function layoutBehaviorMapGraph(graph: BehaviorMapGraph): BehaviorMapLayout {
  const childIdsByParent = groupTargetsBySource(graph.edges);
  const edgeByTarget = new Map(graph.edges.map((edge) => [edge.target, edge]));
  const positioned = new Map<string, BehaviorMapLayoutNode>();
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const semanticAreas = graph.nodes.filter((node) => node.kind === 'semantic-area').sort(compareByRef);

  semanticAreas.forEach((node, index) => {
    const column = index % AREA_COLUMNS;
    const row = Math.floor(index / AREA_COLUMNS);
    const expanded = hasChildren(node.id, childIdsByParent);
    positioned.set(
      node.id,
      toLayoutNode(
        node,
        190 + column * AREA_COLUMN_GAP,
        170 + row * AREA_ROW_GAP,
        expanded,
      ),
    );
  });

  for (const area of semanticAreas) {
    placeDescendants(area.id, nodesById, childIdsByParent, edgeByTarget, positioned);
  }

  const edges = graph.edges.flatMap((edge) => {
    const source = positioned.get(edge.source);
    const target = positioned.get(edge.target);
    return source && target
      ? [{ ...edge, ...edgeEndpoints(source, target) }]
      : [];
  });

  const bounds = [...positioned.values()].reduce(
    (current, node) => ({
      minX: Math.min(current.minX, node.x - node.width / 2 - 80),
      maxX: Math.max(current.maxX, node.x + node.width / 2 + 120),
      minY: Math.min(current.minY, node.y - node.height / 2 - 80),
      maxY: Math.max(current.maxY, node.y + node.height / 2 + 80),
    }),
    { minX: 0, minY: 0, maxX: CANVAS_WIDTH, maxY: CANVAS_HEIGHT },
  );

  return {
    nodes: [...positioned.values()].sort((a, b) => a.id.localeCompare(b.id)),
    edges,
    width: Math.ceil(bounds.maxX - Math.min(0, bounds.minX)),
    height: Math.ceil(bounds.maxY - Math.min(0, bounds.minY)),
  };
}

function placeDescendants(
  parentId: string,
  nodesById: ReadonlyMap<string, BehaviorMapNode>,
  childIdsByParent: ReadonlyMap<string, readonly string[]>,
  edgeByTarget: ReadonlyMap<string, BehaviorMapEdge>,
  positioned: Map<string, BehaviorMapLayoutNode>,
) {
  const parent = positioned.get(parentId);
  if (!parent) return;

  const children = (childIdsByParent.get(parentId) ?? [])
    .map((id) => nodesById.get(id))
    .filter((node): node is BehaviorMapNode => Boolean(node))
    .sort(compareByRef);
  if (children.length === 0) return;

  const rows = Math.min(CHILD_WRAP_COUNT, children.length);
  const blockHeight = (rows - 1) * CHILD_Y_GAP;

  children.forEach((node, index) => {
    const column = Math.floor(index / CHILD_WRAP_COUNT);
    const row = index % CHILD_WRAP_COUNT;
    const relationship = edgeByTarget.get(node.id)?.kind;
    const isCapabilityBranch = relationship === 'workflow-uses-capability';
    const x = parent.x + CHILD_X_GAP + column * (isCapabilityBranch ? 230 : 260);
    const curveOffset = children.length > 2 ? Math.sin((row / Math.max(rows - 1, 1)) * Math.PI) * 22 : 0;
    const y = parent.y - blockHeight / 2 + row * CHILD_Y_GAP + curveOffset + (column % 2) * 28;
    positioned.set(node.id, toLayoutNode(node, x, y, hasChildren(node.id, childIdsByParent)));
  });

  for (const node of children) {
    placeDescendants(node.id, nodesById, childIdsByParent, edgeByTarget, positioned);
  }
}

function groupTargetsBySource(edges: readonly BehaviorMapEdge[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const edge of edges) groups.set(edge.source, [...(groups.get(edge.source) ?? []), edge.target].sort());
  return groups;
}

function toLayoutNode(node: BehaviorMapNode, x: number, y: number, expanded: boolean): BehaviorMapLayoutNode {
  const shape = node.kind === 'semantic-area' ? 'circle' : 'pill';
  const radius = node.kind === 'semantic-area' ? (expanded ? 34 : 56 + Math.min(46, node.sizeWeight * 7)) : 0;
  const width = shape === 'pill' ? Math.max(node.kind === 'capability' ? 140 : 172, node.label.length * 7.2 + (node.workflowSubtype === 'aggregated' ? 94 : 46)) : radius * 2;
  const height = shape === 'pill' ? (node.kind === 'capability' ? 38 : 44) : radius * 2;
  return { ...node, x: Math.round(x), y: Math.round(y), radius, width: Math.round(width), height, shape, expanded };
}

function edgeEndpoints(source: BehaviorMapLayoutNode, target: BehaviorMapLayoutNode) {
  const sourceX = source.shape === 'pill' ? source.x + source.width / 2 : source.x + source.radius;
  const targetX = target.shape === 'pill' ? target.x - target.width / 2 : target.x - target.radius;
  return { sourceX, sourceY: source.y, targetX, targetY: target.y };
}

function hasChildren(id: string, childIdsByParent: ReadonlyMap<string, readonly string[]>): boolean {
  return Boolean(childIdsByParent.get(id)?.length);
}

function compareByRef(a: BehaviorMapNode, b: BehaviorMapNode) {
  return a.ref.localeCompare(b.ref);
}
