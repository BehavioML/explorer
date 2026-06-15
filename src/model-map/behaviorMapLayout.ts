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
  readonly displayLines: readonly string[];
};

type ForceLink = SimulationLinkDatum<ForceNode> & Omit<BehaviorMapEdge, 'source' | 'target'> & { readonly sourceId: string; readonly targetId: string };

const DEFAULT_WIDTH = 1800;
const DEFAULT_HEIGHT = 1200;
const CENTER_X = DEFAULT_WIDTH / 2;
const CENTER_Y = DEFAULT_HEIGHT / 2;
const BOUNDS_MARGIN = 180;
const SIMULATION_TICKS = 360;

export function layoutBehaviorMapGraph(graph: BehaviorMapGraph): BehaviorMapLayout {
  const childIds = new Set(graph.edges.map((edge) => edge.source));
  const nodes: ForceNode[] = graph.nodes.map((node, index) => seedNode(node, childIds.has(node.id), index, graph.nodes.length));
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const links: ForceLink[] = graph.edges.flatMap((edge) => {
    const source = nodesById.get(edge.source);
    const target = nodesById.get(edge.target);
    return source && target ? [{ ...edge, sourceId: edge.source, targetId: edge.target, source, target }] : [];
  });

  const simulation = forceSimulation<ForceNode>(nodes)
    .force('link', forceLink<ForceNode, ForceLink>(links).id((node) => node.id).distance((link) => linkDistanceByKinds(linkSourceKind(link), linkTargetKind(link))).strength(0.45))
    .force('charge', forceManyBody<ForceNode>().strength((node) => node.kind === 'manifest' ? -900 : -520))
    .force('center', forceCenter(CENTER_X, CENTER_Y).strength(0.08))
    .force('collision', forceCollide<ForceNode>().radius((node) => nodeRadius(node) + 22).strength(0.95).iterations(3))
    .force('radial', forceRadial<ForceNode>((node) => radialDistanceByKind(node.kind), CENTER_X, CENTER_Y).strength((node) => node.kind === 'manifest' ? 1 : 0.42))
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
    width: Math.ceil(Math.max(DEFAULT_WIDTH, bounds.maxX - Math.min(0, bounds.minX))),
    height: Math.ceil(Math.max(DEFAULT_HEIGHT, bounds.maxY - Math.min(0, bounds.minY))),
    bounds,
  };
}

export function radialDistanceByKind(kind: BehaviorMapNodeKind): number {
  switch (kind) {
    case 'manifest': return 0;
    case 'semantic-area': return 250;
    case 'aggregated-workflow': return 470;
    case 'workflow': return 610;
    case 'capability':
    case 'event':
    case 'entity':
    case 'state-machine':
    case 'decision': return 790;
    default: return 720;
  }
}

export function nodeRadius(node: Pick<BehaviorMapNode, 'kind' | 'workflowSubtype'>): number {
  switch (node.kind) {
    case 'manifest': return 96;
    case 'semantic-area': return 82;
    case 'aggregated-workflow': return 72;
    case 'workflow': return node.workflowSubtype === 'aggregated' ? 72 : 62;
    default: return 54;
  }
}

export function linkDistanceByKinds(sourceKind: BehaviorMapNodeKind, targetKind: BehaviorMapNodeKind): number {
  if (sourceKind === 'manifest' && targetKind === 'semantic-area') return 250;
  if (sourceKind === 'semantic-area' && targetKind === 'aggregated-workflow') return 260;
  if (sourceKind === 'semantic-area' && targetKind === 'workflow') return 330;
  if (sourceKind === 'aggregated-workflow' && targetKind === 'workflow') return 220;
  if (targetKind === 'capability' || targetKind === 'event' || targetKind === 'entity' || targetKind === 'state-machine' || targetKind === 'decision') return 260;
  return 300;
}

function seedNode(node: BehaviorMapNode, expanded: boolean, index: number, total: number): ForceNode {
  const radius = nodeRadius(node);
  const shape = node.kind === 'manifest' || node.kind === 'semantic-area' || node.kind === 'aggregated-workflow' ? 'circle' : 'pill';
  const displayLines = labelLines(node);
  const width = shape === 'pill' ? (node.kind === 'capability' ? 190 : 220) : radius * 2;
  const height = shape === 'pill' ? (displayLines.length > 1 || node.workflowSubtype === 'aggregated' ? 52 : 44) : radius * 2;
  const angle = (index / Math.max(1, total)) * Math.PI * 2;
  const distance = radialDistanceByKind(node.kind);
  return { ...node, radius, width, height, shape, expanded, displayLines, x: CENTER_X + Math.cos(angle) * distance, y: CENTER_Y + Math.sin(angle) * distance, fx: node.kind === 'manifest' ? CENTER_X : undefined, fy: node.kind === 'manifest' ? CENTER_Y : undefined };
}

function toLayoutNode(node: ForceNode): BehaviorMapLayoutNode {
  return { ...node, x: Math.round(node.x ?? CENTER_X), y: Math.round(node.y ?? CENTER_Y) };
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
