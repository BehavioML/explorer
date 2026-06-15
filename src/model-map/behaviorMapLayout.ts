import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceRadial,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import type { BehaviorMapEdge, BehaviorMapGraph, BehaviorMapNode, BehaviorMapNodeKind } from './behaviorMapGraph';

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

type ForceNode = BehaviorMapNode & SimulationNodeDatum & {
  readonly radius: number;
  readonly width: number;
  readonly height: number;
  readonly shape: 'circle' | 'pill';
  readonly expanded: boolean;
  readonly clusterParentId?: string;
  readonly displayLines: readonly string[];
};

type ForceLink = SimulationLinkDatum<ForceNode> & Omit<BehaviorMapEdge, 'source' | 'target'> & { readonly sourceId: string; readonly targetId: string };

const DEFAULT_WIDTH = 1800;
const DEFAULT_HEIGHT = 1200;
const BOUNDS_MARGIN = 180;
const SIMULATION_TICKS = 360;

export type BehaviorMapPositionSnapshot = { readonly x: number; readonly y: number; readonly vx?: number; readonly vy?: number };

export interface BehaviorMapLayoutOptions {
  readonly width?: number;
  readonly height?: number;
  readonly previousPositions?: ReadonlyMap<string, BehaviorMapPositionSnapshot>;
}

export function layoutBehaviorMapGraph(graph: BehaviorMapGraph, options: BehaviorMapLayoutOptions = {}): BehaviorMapLayout {
  const width = Math.max(1, options.width ?? DEFAULT_WIDTH);
  const height = Math.max(1, options.height ?? DEFAULT_HEIGHT);
  const centerX = width / 2;
  const centerY = height / 2;
  const expandedParentIds = new Set(graph.edges.map((edge) => edge.source));
  const parentByNodeId = new Map(graph.edges.map((edge) => [edge.target, edge.source]));
  const siblingIndexByNodeId = new Map<string, { index: number; count: number }>();
  const childrenByParent = new Map<string, string[]>();
  for (const edge of graph.edges) childrenByParent.set(edge.source, [...(childrenByParent.get(edge.source) ?? []), edge.target]);
  for (const children of childrenByParent.values()) children.forEach((id, index) => siblingIndexByNodeId.set(id, { index, count: children.length }));
  const nodes: ForceNode[] = graph.nodes.map((node, index) => seedNode(node, expandedParentIds.has(node.id), index, graph.nodes.length, { centerX, centerY, previousPositions: options.previousPositions, parentByNodeId, siblingIndexByNodeId }));
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const links: ForceLink[] = graph.edges.flatMap((edge) => {
    const source = nodesById.get(edge.source);
    const target = nodesById.get(edge.target);
    return source && target ? [{ ...edge, sourceId: edge.source, targetId: edge.target, source, target }] : [];
  });

  const simulation = forceSimulation<ForceNode>(nodes)
    .force('link', forceLink<ForceNode, ForceLink>(links).id((node) => node.id).distance((link) => linkDistanceByKinds(linkSourceKind(link), linkTargetKind(link))).strength(0.45))
    .force('charge', forceManyBody<ForceNode>().strength((node) => node.kind === 'manifest' ? -1000 : -700))
    .force('center', forceCenter(centerX, centerY).strength(0.08))
    .force('collision', forceCollide<ForceNode>().radius((node) => node.radius + 44).strength(1).iterations(3))
    .force('radial', forceRadial<ForceNode>((node) => radialDistanceByKind(node.kind), centerX, centerY).strength((node) => node.kind === 'manifest' ? 1 : 0.32))
    .force('cluster', forceCluster(nodesById))
    .stop();

  for (let tick = 0; tick < SIMULATION_TICKS; tick += 1) simulation.tick();
  simulation.stop();

  const positioned = nodes.map(toLayoutNode);
  const edges = links.flatMap((edge) => {
    const source = asNode(edge.source);
    const target = asNode(edge.target);
    return source && target ? [{ ...edge, source: edge.sourceId, target: edge.targetId, ...edgeEndpoints(source, target) }] : [];
  });
  const bounds = computeBounds(positioned);

  return {
    nodes: positioned.sort((a, b) => a.id.localeCompare(b.id)),
    edges: edges.sort((a, b) => a.id.localeCompare(b.id)),
    width,
    height,
    bounds,
  };
}

export function radialDistanceByKind(kind: BehaviorMapNodeKind): number {
  switch (kind) {
    case 'manifest': return 0;
    case 'semantic-area': return 320;
    case 'aggregated-workflow': return 560;
    case 'workflow': return 760;
    case 'capability':
    case 'event':
    case 'entity':
    case 'state-machine':
    case 'decision': return 980;
    default: return 900;
  }
}

export function nodeRadius(node: Pick<BehaviorMapNode, 'kind' | 'workflowSubtype'> & { readonly expanded?: boolean }): number {
  switch (node.kind) {
    case 'manifest': return 96;
    case 'semantic-area': return node.expanded ? 56 : 78;
    case 'aggregated-workflow': return 72;
    case 'workflow': return node.workflowSubtype === 'aggregated' ? 72 : 62;
    default: return 54;
  }
}

export function linkDistanceByKinds(sourceKind: BehaviorMapNodeKind, targetKind: BehaviorMapNodeKind): number {
  if (sourceKind === 'manifest' || targetKind === 'manifest') return 260;
  if (sourceKind === 'semantic-area' || targetKind === 'semantic-area') return 260;
  if (sourceKind === 'aggregated-workflow' || targetKind === 'aggregated-workflow') return 220;
  return 180;
}

function seedNode(node: BehaviorMapNode, expanded: boolean, index: number, total: number, options: { readonly centerX: number; readonly centerY: number; readonly previousPositions?: ReadonlyMap<string, BehaviorMapPositionSnapshot>; readonly parentByNodeId: ReadonlyMap<string, string>; readonly siblingIndexByNodeId: ReadonlyMap<string, { index: number; count: number }> }): ForceNode {
  const radius = nodeRadius({ ...node, expanded });
  const shape = node.kind === 'manifest' || node.kind === 'semantic-area' || node.kind === 'aggregated-workflow' ? 'circle' : 'pill';
  const displayLines = labelLines(node);
  const width = shape === 'pill' ? (node.kind === 'capability' ? 190 : 220) : radius * 2;
  const height = shape === 'pill' ? (displayLines.length > 1 || node.workflowSubtype === 'aggregated' ? 52 : 44) : radius * 2;
  const previous = options.previousPositions?.get(node.id);
  const clusterParentId = options.parentByNodeId.get(node.id);
  const parent = options.previousPositions?.get(clusterParentId ?? '');
  const sibling = options.siblingIndexByNodeId.get(node.id) ?? { index, count: total };
  const angle = (sibling.index / Math.max(1, sibling.count)) * Math.PI * 2;
  const distance = radialDistanceByKind(node.kind);
  const initialChildDistance = parent ? nodeRadius({ kind: node.kind, workflowSubtype: node.workflowSubtype }) + 120 : distance;
  const x = previous?.x ?? (parent ? parent.x + Math.cos(angle) * initialChildDistance : options.centerX + Math.cos(angle) * distance);
  const y = previous?.y ?? (parent ? parent.y + Math.sin(angle) * initialChildDistance : options.centerY + Math.sin(angle) * distance);
  return { ...node, radius, width, height, shape, expanded, clusterParentId, displayLines, x, y, vx: previous?.vx, vy: previous?.vy, fx: node.kind === 'manifest' ? options.centerX : undefined, fy: node.kind === 'manifest' ? options.centerY : undefined };
}

function forceCluster(nodesById: ReadonlyMap<string, ForceNode>) {
  let nodes: ForceNode[] = [];
  function force(alpha: number) {
    const pull = alpha * 0.18;
    for (const node of nodes) {
      if (!node.clusterParentId || node.kind === 'manifest') continue;
      const parent = nodesById.get(node.clusterParentId);
      if (!parent || parent === node) continue;
      const dx = (parent.x ?? 0) - (node.x ?? 0);
      const dy = (parent.y ?? 0) - (node.y ?? 0);
      const strength = node.kind === 'semantic-area' ? 0.4 : 1;
      node.vx = (node.vx ?? 0) + dx * pull * strength;
      node.vy = (node.vy ?? 0) + dy * pull * strength;
    }
  }
  force.initialize = (nextNodes: ForceNode[]) => { nodes = nextNodes; };
  return force;
}

function toLayoutNode(node: ForceNode): BehaviorMapLayoutNode {
  return { ...node, x: Math.round(node.x ?? 0), y: Math.round(node.y ?? 0) };
}

function labelLines(node: BehaviorMapNode): readonly string[] {
  if (node.kind === 'manifest') return wrapText(node.label, 18, 2);
  if (node.kind === 'semantic-area' || node.kind === 'aggregated-workflow') return wrapText(node.label, 16, 2);
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
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.hypot(dx, dy) || 1;
  const sourceOffset = endpointOffset(source, dx / distance, dy / distance);
  const targetOffset = endpointOffset(target, -dx / distance, -dy / distance);
  return { sourceX: source.x + sourceOffset.x, sourceY: source.y + sourceOffset.y, targetX: target.x + targetOffset.x, targetY: target.y + targetOffset.y };
}

function endpointOffset(node: BehaviorMapLayoutNode, unitX: number, unitY: number) {
  if (node.shape === 'circle') return { x: unitX * node.radius, y: unitY * node.radius };
  return { x: unitX * node.width / 2, y: unitY * node.height / 2 };
}

function computeBounds(nodes: readonly BehaviorMapLayoutNode[]): BehaviorMapBounds {
  if (nodes.length === 0) return { minX: 0, minY: 0, maxX: DEFAULT_WIDTH, maxY: DEFAULT_HEIGHT };
  return nodes.reduce((bounds, node) => {
    const halfWidth = node.shape === 'pill' ? node.width / 2 : node.radius;
    const halfHeight = node.shape === 'pill' ? node.height / 2 : node.radius;
    return { minX: Math.min(bounds.minX, node.x - halfWidth - BOUNDS_MARGIN), minY: Math.min(bounds.minY, node.y - halfHeight - BOUNDS_MARGIN), maxX: Math.max(bounds.maxX, node.x + halfWidth + BOUNDS_MARGIN), maxY: Math.max(bounds.maxY, node.y + halfHeight + BOUNDS_MARGIN) };
  }, { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY });
}

function asNode(value: string | number | ForceNode): BehaviorMapLayoutNode | undefined {
  return typeof value === 'object' ? toLayoutNode(value) : undefined;
}
function linkSourceKind(link: ForceLink): BehaviorMapNodeKind {
  const source = asForceNode(link.source);
  return source?.kind ?? 'workflow';
}
function linkTargetKind(link: ForceLink): BehaviorMapNodeKind {
  const target = asForceNode(link.target);
  return target?.kind ?? 'workflow';
}
function asForceNode(value: string | number | ForceNode): ForceNode | undefined {
  return typeof value === 'object' ? value : undefined;
}
