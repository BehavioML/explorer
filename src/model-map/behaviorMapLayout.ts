import type { BehaviorMapEdge, BehaviorMapGraph, BehaviorMapNode } from './behaviorMapGraph';

export interface BehaviorMapLayoutNode extends BehaviorMapNode {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly width: number;
  readonly height: number;
  readonly shape: 'circle' | 'pill';
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

export function layoutBehaviorMapGraph(graph: BehaviorMapGraph): BehaviorMapLayout {
  const semanticAreas = graph.nodes.filter((node) => node.kind === 'semantic-area');
  const nonAreas = graph.nodes.filter((node) => node.kind !== 'semantic-area');
  const areaByWorkflow = new Map(graph.edges.filter((edge) => edge.kind === 'semantic-area-contains-workflow').map((edge) => [edge.target, edge.source]));
  const childByParent = groupTargetsBySource(graph.edges);
  const width = 1200;
  const height = 760;
  const centerX = width / 2;
  const centerY = height / 2;
  const ring = Math.min(width, height) * 0.32;
  const positioned = new Map<string, BehaviorMapLayoutNode>();

  semanticAreas.forEach((node, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / Math.max(semanticAreas.length, 1);
    const expanded = childByParent.get(node.id)?.length;
    positioned.set(node.id, toLayoutNode(node, centerX + Math.cos(angle) * ring, centerY + Math.sin(angle) * ring, expanded ? 34 : 52 + Math.min(44, node.sizeWeight * 7)));
  });

  for (const node of nonAreas) {
    const parentId = areaByWorkflow.get(node.id) ?? graph.edges.find((edge) => edge.target === node.id)?.source;
    const parent = parentId ? positioned.get(parentId) : undefined;
    const siblings = parentId ? childByParent.get(parentId) ?? [] : nonAreas.map((item) => item.id);
    const index = Math.max(0, siblings.indexOf(node.id));
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / Math.max(siblings.length, 1);
    const orbit = parent ? Math.max(parent.radius + 74, 120) : 180;
    const x = (parent?.x ?? centerX) + Math.cos(angle) * orbit;
    const y = (parent?.y ?? centerY) + Math.sin(angle) * orbit;
    const expanded = childByParent.get(node.id)?.length;
    const radius = node.kind === 'capability' ? 36 : expanded ? 26 : 42;
    positioned.set(node.id, toLayoutNode(node, x, y, radius));
  }

  const edges = graph.edges.flatMap((edge) => {
    const source = positioned.get(edge.source);
    const target = positioned.get(edge.target);
    return source && target ? [{ ...edge, sourceX: source.x, sourceY: source.y, targetX: target.x, targetY: target.y }] : [];
  });

  return { nodes: [...positioned.values()].sort((a, b) => a.id.localeCompare(b.id)), edges, width, height };
}

function groupTargetsBySource(edges: readonly BehaviorMapEdge[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const edge of edges) groups.set(edge.source, [...(groups.get(edge.source) ?? []), edge.target].sort());
  return groups;
}

function toLayoutNode(node: BehaviorMapNode, x: number, y: number, radius: number): BehaviorMapLayoutNode {
  const isPill = node.kind === 'capability';
  return {
    ...node,
    x: Math.round(x),
    y: Math.round(y),
    radius,
    width: isPill ? Math.max(120, node.label.length * 8 + 32) : radius * 2,
    height: isPill ? 44 : radius * 2,
    shape: isPill ? 'pill' : 'circle',
  };
}
