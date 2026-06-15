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
  readonly visualParentId?: string;
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
  const visualParentByNodeId = visualParentsByNode(graph);
  const siblingIndexByNodeId = new Map<string, { index: number; count: number }>();
  const childrenByParent = new Map<string, string[]>();
  for (const [childId, parentId] of visualParentByNodeId) childrenByParent.set(parentId, [...(childrenByParent.get(parentId) ?? []), childId]);
  for (const children of childrenByParent.values()) children.forEach((id, index) => siblingIndexByNodeId.set(id, { index, count: children.length }));
  const nodes: ForceNode[] = graph.nodes.map((node, index) => seedNode(node, expandedParentIds.has(node.id), index, graph.nodes.length, { centerX, centerY, previousPositions: options.previousPositions, visualParentByNodeId, siblingIndexByNodeId }));
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const links: ForceLink[] = graph.edges.flatMap((edge) => {
    const source = nodesById.get(edge.source);
    const target = nodesById.get(edge.target);
    return source && target ? [{ ...edge, sourceId: edge.source, targetId: edge.target, source, target }] : [];
  });

  const simulation = forceSimulation<ForceNode>(nodes)
    .force('link', forceLink<ForceNode, ForceLink>(links).id((node) => node.id).distance((link) => linkDistanceByKinds(linkSourceKind(link), linkTargetKind(link))).strength((link) => link.kind === 'model-reference' ? 0.14 : 0.48))
    .force('charge', forceManyBody<ForceNode>().strength((node) => node.kind === 'manifest' ? -900 : node.kind === 'semantic-area' ? -980 : -620))
    .force('center', forceCenter(centerX, centerY).strength(0.055))
    .force('collision', forceCollide<ForceNode>().radius((node) => nodeCollisionRadius(node) + (node.visualParentId ? 34 : 54)).strength(1).iterations(4))
    .force('radial', forceRadial<ForceNode>((node) => radialDistanceByKind(node.kind), centerX, centerY).strength((node) => node.kind === 'manifest' ? 1 : node.visualParentId ? 0.12 : 0.24))
    .force('siblingSeparation', forceSiblingSeparation())
    .force('parentDistance', forceParentDistance(nodesById))
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

function seedNode(node: BehaviorMapNode, expanded: boolean, index: number, total: number, options: { readonly centerX: number; readonly centerY: number; readonly previousPositions?: ReadonlyMap<string, BehaviorMapPositionSnapshot>; readonly visualParentByNodeId: ReadonlyMap<string, string>; readonly siblingIndexByNodeId: ReadonlyMap<string, { index: number; count: number }> }): ForceNode {
  const radius = nodeRadius({ ...node, expanded });
  const shape = node.kind === 'manifest' || node.kind === 'semantic-area' || node.kind === 'aggregated-workflow' ? 'circle' : 'pill';
  const displayLines = labelLines(node);
  const width = shape === 'pill' ? (node.kind === 'capability' ? 190 : 220) : radius * 2;
  const height = shape === 'pill' ? (displayLines.length > 1 || node.workflowSubtype === 'aggregated' ? 52 : 44) : radius * 2;
  const previous = options.previousPositions?.get(node.id);
  const visualParentId = options.visualParentByNodeId.get(node.id);
  const parent = options.previousPositions?.get(visualParentId ?? '');
  const sibling = options.siblingIndexByNodeId.get(node.id) ?? { index, count: total };
  const angle = (sibling.index / Math.max(1, sibling.count)) * Math.PI * 2;
  const distance = radialDistanceByKind(node.kind);
  const initialChildDistance = parent ? parentSeedDistance(node, sibling.count) : distance;
  const x = previous?.x ?? (parent ? parent.x + Math.cos(angle) * initialChildDistance : options.centerX + Math.cos(angle) * distance);
  const y = previous?.y ?? (parent ? parent.y + Math.sin(angle) * initialChildDistance : options.centerY + Math.sin(angle) * distance);
  return { ...node, radius, width, height, shape, expanded, visualParentId, displayLines, x, y, vx: previous?.vx, vy: previous?.vy, fx: node.kind === 'manifest' ? options.centerX : undefined, fy: node.kind === 'manifest' ? options.centerY : undefined };
}

function visualParentsByNode(graph: BehaviorMapGraph): ReadonlyMap<string, string> {
  const parents = new Map<string, string>();
  const priorityByKind: Record<BehaviorMapEdge['kind'], number> = {
    'manifest-contains-semantic-area': 10,
    'semantic-area-contains-aggregated-workflow': 20,
    'semantic-area-contains-workflow': 20,
    'aggregated-workflow-contains-workflow': 30,
    'workflow-uses-capability': 40,
    'model-reference': 50,
  };
  const chosenPriority = new Map<string, number>();
  for (const edge of graph.edges) {
    const priority = priorityByKind[edge.kind];
    const previous = chosenPriority.get(edge.target) ?? Number.POSITIVE_INFINITY;
    if (priority < previous || (priority === previous && edge.source.localeCompare(parents.get(edge.target) ?? '') < 0)) {
      parents.set(edge.target, edge.source);
      chosenPriority.set(edge.target, priority);
    }
  }
  return parents;
}

function parentSeedDistance(node: BehaviorMapNode, siblingCount: number): number {
  const circumferenceSpacing = nodeRadius(node) * 2 + 70;
  const ringDistance = Math.max(150, (siblingCount * circumferenceSpacing) / (Math.PI * 2));
  if (node.kind === 'semantic-area') return Math.max(260, ringDistance);
  if (node.kind === 'workflow' || node.kind === 'aggregated-workflow') return Math.min(270, ringDistance);
  return Math.min(230, ringDistance);
}

function forceSiblingSeparation(minGap = 42) {
  let nodes: ForceNode[] = [];
  function force(alpha: number) {
    const groups = new Map<string, ForceNode[]>();
    for (const node of nodes) {
      if (!node.visualParentId) continue;
      groups.set(node.visualParentId, [...(groups.get(node.visualParentId) ?? []), node]);
    }
    for (const siblings of groups.values()) {
      for (let i = 0; i < siblings.length; i += 1) {
        for (let j = i + 1; j < siblings.length; j += 1) {
          const a = siblings[i];
          const b = siblings[j];
          const dx = (b.x ?? 0) - (a.x ?? 0);
          const dy = (b.y ?? 0) - (a.y ?? 0);
          const distance = Math.max(1, Math.hypot(dx, dy));
          const wanted = nodeCollisionRadius(a) + nodeCollisionRadius(b) + minGap;
          if (distance >= wanted) continue;
          const push = ((wanted - distance) / distance) * alpha * 0.78;
          const px = dx * push;
          const py = dy * push;
          a.vx = (a.vx ?? 0) - px;
          a.vy = (a.vy ?? 0) - py;
          b.vx = (b.vx ?? 0) + px;
          b.vy = (b.vy ?? 0) + py;
        }
      }
    }
  }
  force.initialize = (nextNodes: ForceNode[]) => { nodes = nextNodes; };
  return force;
}

function forceParentDistance(nodesById: ReadonlyMap<string, ForceNode>) {
  let nodes: ForceNode[] = [];
  function force(alpha: number) {
    for (const node of nodes) {
      if (!node.visualParentId || node.kind === 'manifest') continue;
      const parent = nodesById.get(node.visualParentId);
      if (!parent || parent === node) continue;
      const dx = (node.x ?? 0) - (parent.x ?? 0);
      const dy = (node.y ?? 0) - (parent.y ?? 0);
      const distance = Math.max(1, Math.hypot(dx, dy));
      const preferred = preferredParentDistance(node);
      const maxDistance = preferred * 1.85;
      const minDistance = nodeCollisionRadius(node) + nodeCollisionRadius(parent) + 34;
      if (distance > maxDistance) {
        const pull = ((distance - preferred) / distance) * alpha * 0.18;
        node.vx = (node.vx ?? 0) - dx * pull;
        node.vy = (node.vy ?? 0) - dy * pull;
      } else if (distance < minDistance) {
        const push = ((minDistance - distance) / distance) * alpha * 0.26;
        node.vx = (node.vx ?? 0) + dx * push;
        node.vy = (node.vy ?? 0) + dy * push;
      }
    }
  }
  force.initialize = (nextNodes: ForceNode[]) => { nodes = nextNodes; };
  return force;
}

function preferredParentDistance(node: ForceNode): number {
  if (node.kind === 'semantic-area') return 300;
  if (node.kind === 'workflow' || node.kind === 'aggregated-workflow') return 220;
  return 190;
}

function nodeCollisionRadius(node: Pick<ForceNode, 'shape' | 'radius' | 'width' | 'height'>): number {
  return node.shape === 'pill' ? Math.hypot(node.width / 2, node.height / 2) : node.radius;
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

export function edgeEndpoints(source: BehaviorMapLayoutNode, target: BehaviorMapLayoutNode) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.hypot(dx, dy) || 1;
  const sourceOffset = endpointOffset(source, dx / distance, dy / distance);
  const targetOffset = endpointOffset(target, -dx / distance, -dy / distance);
  return { sourceX: source.x + sourceOffset.x, sourceY: source.y + sourceOffset.y, targetX: target.x + targetOffset.x, targetY: target.y + targetOffset.y };
}

function endpointOffset(node: BehaviorMapLayoutNode, unitX: number, unitY: number) {
  if (node.shape === 'circle') return { x: unitX * node.radius, y: unitY * node.radius };
  const halfWidth = node.width / 2;
  const halfHeight = node.height / 2;
  const scale = Math.min(Math.abs(halfWidth / (unitX || 0.0001)), Math.abs(halfHeight / (unitY || 0.0001)));
  return { x: unitX * scale, y: unitY * scale };
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
