import type {
  DiagnosticViewModel,
  EntitySummaryViewModel,
  PathDerivedEntityIndex,
  PathDerivedModelEntity,
  SemanticReferenceIndexViewModel,
} from '../core';

export type BehaviorMapNodeKind = 'manifest' | 'semantic-area' | 'aggregated-workflow' | 'workflow' | 'capability' | 'event' | 'entity' | 'state-machine' | 'decision';
export type WorkflowVisualSubtype = 'regular' | 'aggregated';

export type BehaviorMapNode = {
  id: string;
  canonicalId: string;
  ref: string;
  kind: BehaviorMapNodeKind;
  visualParentId?: string;
  label: string;
  sizeWeight: number;
  workflowSubtype?: WorkflowVisualSubtype;
  diagnostics?: { errors: number; warnings: number; info: number };
};

export type BehaviorMapEdgeKind =
  | 'manifest-contains-semantic-area'
  | 'semantic-area-contains-workflow'
  | 'semantic-area-contains-aggregated-workflow'
  | 'aggregated-workflow-contains-workflow'
  | 'workflow-uses-capability'
  | 'model-reference';

export type BehaviorMapEdge = {
  id: string;
  source: string;
  target: string;
  kind: BehaviorMapEdgeKind;
  explicit: true;
  sourceField: string;
};

export type BehaviorMapGraph = { nodes: BehaviorMapNode[]; edges: BehaviorMapEdge[] };

export interface BehaviorMapExpansionState {
  readonly expandedNodeIds: ReadonlySet<string>;
}

export interface CreateBehaviorMapGraphInput {
  readonly entityIndex: PathDerivedEntityIndex;
  readonly entitySummaries?: readonly EntitySummaryViewModel[];
  readonly referenceIndex?: SemanticReferenceIndexViewModel;
  readonly diagnostics?: readonly DiagnosticViewModel[];
  readonly expansion?: BehaviorMapExpansionState;
  readonly manifestId?: string;
}

const NODE_SCOPE_BY_KIND = {
  'semantic-area': 'semantic-areas',
  workflow: 'workflows',
  'aggregated-workflow': 'workflows',
  capability: 'capabilities',
  event: 'events',
  entity: 'entities',
  'state-machine': 'state-machines',
  decision: 'decisions',
} as const;

export function createBehaviorMapGraph(input: CreateBehaviorMapGraphInput): BehaviorMapGraph {
  const artifactByRef = new Map(input.entityIndex.entities.map((entity) => [toRef(entity.scope, entity.identity), entity]));
  const nodes = new Map<string, BehaviorMapNode>();
  const edges = new Map<string, BehaviorMapEdge>();
  const diagnosticsByRef = summarizeDiagnostics(input.diagnostics ?? [], input.entityIndex.entities);
  const semanticAreaSummaries = (input.entitySummaries ?? []).filter((summary) => summary.scope === 'semantic-areas');
  const manifestId = input.manifestId?.trim() || 'BehavioML manifest';
  const manifestNode = createManifestNode(manifestId);
  addNode(nodes, manifestNode);

  for (const area of input.entityIndex.entities.filter((entity) => entity.scope === 'semantic-areas')) {
    const summary = semanticAreaSummaries.find((candidate) => candidate.identity === area.identity);
    const workflowRefs = getSemanticAreaWorkflowReferences(summary, input.referenceIndex, area);
    addNode(nodes, createNode(area, 'semantic-area', workflowRefs.length || 1, diagnosticsByRef));
    addEdgeByNodeIds(edges, manifestNode.id, toNodeId('semantic-area', area), 'manifest-contains-semantic-area', 'behavio.yaml:id');

    if (!input.expansion?.expandedNodeIds.has(toNodeId('semantic-area', area))) {
      continue;
    }

    for (const workflowRef of workflowRefs) {
      const workflow = artifactByRef.get(toRef('workflows', workflowRef));
      if (!workflow) {
        continue;
      }
      const workflowNode = addWorkflowNode(nodes, workflow, input.referenceIndex, diagnosticsByRef);
      addEdgeByNodeIds(edges, toNodeId('semantic-area', area), workflowNode.id, workflowNode.kind === 'aggregated-workflow' ? 'semantic-area-contains-aggregated-workflow' : 'semantic-area-contains-workflow', 'workflows[]');
    }
  }

  const processedExpandedWorkflows = new Set<string>();
  let addedExpandedWorkflow = true;
  while (addedExpandedWorkflow) {
    addedExpandedWorkflow = false;
    const expandedWorkflows = [...nodes.values()].filter(
      (node) =>
        (node.kind === 'workflow' || node.kind === 'aggregated-workflow') &&
        input.expansion?.expandedNodeIds.has(node.canonicalId) &&
        !processedExpandedWorkflows.has(node.id),
    );
    for (const node of expandedWorkflows) {
      processedExpandedWorkflows.add(node.id);
      const workflow = artifactByRef.get(node.ref);
      if (!workflow) continue;
      for (const reference of input.referenceIndex?.outgoingReferences ?? []) {
        if (reference.source.scope !== 'workflows' || reference.source.identity !== workflow.identity || !reference.resolved) {
          continue;
        }
        if (reference.targetScope === 'workflows' && isAggregateWorkflowField(reference.fieldPath)) {
          const child = artifactByRef.get(toRef('workflows', reference.targetIdentity));
          if (!child) continue;
          const childNode = addWorkflowNode(nodes, child, input.referenceIndex, diagnosticsByRef);
          addEdgeByNodeIds(edges, node.id, childNode.id, 'aggregated-workflow-contains-workflow', reference.fieldPath);
          addedExpandedWorkflow = true;
        }
        if (reference.targetScope === 'capabilities' && isStepCapabilityField(reference.fieldPath)) {
          const capability = artifactByRef.get(toRef('capabilities', reference.targetIdentity));
          if (!capability) continue;
          const capabilityNode = createNode(capability, 'capability', 1, diagnosticsByRef);
          addNode(nodes, capabilityNode);
          addEdgeByNodeIds(edges, node.id, capabilityNode.id, 'workflow-uses-capability', reference.fieldPath);
        }
        if (isRelatedModelScope(reference.targetScope) && !isAggregateWorkflowField(reference.fieldPath) && !isStepCapabilityField(reference.fieldPath)) {
          const target = artifactByRef.get(toRef(reference.targetScope, reference.targetIdentity));
          const targetKind = nodeKindForScope(reference.targetScope);
          if (!target || !targetKind) continue;
          const targetNode = createNode(target, targetKind, 1, diagnosticsByRef);
          addNode(nodes, targetNode);
          addEdgeByNodeIds(edges, node.id, targetNode.id, 'model-reference', reference.fieldPath);
        }
      }
    }
  }

  return duplicateSharedVisualNodes({ nodes: [...nodes.values()], edges: [...edges.values()] });
}

export function toBehaviorMapNodeId(kind: BehaviorMapNodeKind, scope: string, identity: string): string {
  return `${kind}:${scope}:${identity}`;
}

export function toRef(scope: string, identity: string): string {
  return `${scope}/${identity}`;
}

export function parseBehaviorMapRef(ref: string): { scope: string; identity: string } | undefined {
  const slash = ref.indexOf('/');
  return slash > 0 ? { scope: ref.slice(0, slash), identity: ref.slice(slash + 1) } : undefined;
}

function addWorkflowNode(
  nodes: Map<string, BehaviorMapNode>,
  workflow: PathDerivedModelEntity,
  referenceIndex: SemanticReferenceIndexViewModel | undefined,
  diagnosticsByRef: Map<string, BehaviorMapNode['diagnostics']>,
): BehaviorMapNode {
  const subtype: WorkflowVisualSubtype = (referenceIndex?.outgoingReferences ?? []).some(
    (reference) =>
      reference.source.scope === 'workflows' &&
      reference.source.identity === workflow.identity &&
      reference.targetScope === 'workflows' &&
      reference.resolved &&
      isAggregateWorkflowField(reference.fieldPath),
  )
    ? 'aggregated'
    : 'regular';
  const kind = subtype === 'aggregated' ? 'aggregated-workflow' : 'workflow';
  const node = { ...createNode(workflow, kind, 1, diagnosticsByRef), workflowSubtype: subtype };
  addNode(nodes, node);
  return node;
}

function getSemanticAreaWorkflowReferences(
  summary: EntitySummaryViewModel | undefined,
  referenceIndex: SemanticReferenceIndexViewModel | undefined,
  area: PathDerivedModelEntity,
): readonly string[] {
  const fromReferences = (referenceIndex?.outgoingReferences ?? [])
    .filter(
      (reference) =>
        reference.source.scope === 'semantic-areas' &&
        reference.source.identity === area.identity &&
        reference.targetScope === 'workflows' &&
        reference.resolved &&
        reference.fieldPath.startsWith('workflows['),
    )
    .map((reference) => reference.targetIdentity);
  return fromReferences.length > 0 ? uniqueSorted(fromReferences) : uniqueSorted(summary?.workflowReferences ?? []);
}

function isStepCapabilityField(fieldPath: string): boolean {
  return /^steps\[\d+\]\.capability$/.test(fieldPath);
}

function isAggregateWorkflowField(fieldPath: string): boolean {
  return /^steps\[\d+\]\.workflow$/.test(fieldPath);
}

function createManifestNode(manifestId: string): BehaviorMapNode {
  const id = `manifest:${manifestId}`;
  return { id, canonicalId: id, ref: `manifest/${manifestId}`, kind: 'manifest', label: manifestId, sizeWeight: 1 };
}

function createNode(
  entity: PathDerivedModelEntity,
  kind: BehaviorMapNodeKind,
  sizeWeight: number,
  diagnosticsByRef: Map<string, BehaviorMapNode['diagnostics']>,
): BehaviorMapNode {
  const ref = toRef(entity.scope, entity.identity);
  return {
    id: toNodeId(kind, entity),
    canonicalId: toNodeId(kind, entity),
    ref,
    kind,
    label: entity.displayName,
    sizeWeight,
    ...(diagnosticsByRef.get(ref) ? { diagnostics: diagnosticsByRef.get(ref) } : {}),
  };
}

function toNodeId(kind: BehaviorMapNodeKind, entity: Pick<PathDerivedModelEntity, 'scope' | 'identity'>): string {
  return toBehaviorMapNodeId(kind, entity.scope, entity.identity);
}

function addNode(nodes: Map<string, BehaviorMapNode>, node: BehaviorMapNode) {
  if (node.kind === 'manifest' || NODE_SCOPE_BY_KIND[node.kind] === parseBehaviorMapRef(node.ref)?.scope) nodes.set(node.id, node);
}

function addEdgeByNodeIds(edges: Map<string, BehaviorMapEdge>, source: string, target: string, kind: BehaviorMapEdgeKind, sourceField: string) {
  const edge = { id: `${kind}:${source}->${target}:${sourceField}`, source, target, kind, explicit: true as const, sourceField };
  edges.set(edge.id, edge);
}

function duplicateSharedVisualNodes(graph: BehaviorMapGraph): BehaviorMapGraph {
  const canonicalNodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const visualNodesByCanonicalId = new Map<string, Set<string>>();
  const nodes = new Map<string, BehaviorMapNode>();

  const addVisualNode = (canonicalNode: BehaviorMapNode, visualParentId?: string): BehaviorMapNode => {
    const id = makeVisualNodeId(canonicalNode.kind, canonicalNode.id, visualParentId);
    const node: BehaviorMapNode = id === canonicalNode.id
      ? canonicalNode
      : { ...canonicalNode, id, canonicalId: canonicalNode.id, visualParentId };
    nodes.set(id, node);
    if (!visualNodesByCanonicalId.has(canonicalNode.id)) visualNodesByCanonicalId.set(canonicalNode.id, new Set());
    visualNodesByCanonicalId.get(canonicalNode.id)?.add(id);
    return node;
  };

  for (const node of graph.nodes) {
    const hasIncoming = graph.edges.some((edge) => edge.target === node.id);
    if (!hasIncoming || !isDuplicableVisualKind(node.kind)) addVisualNode(node);
  }

  const edges = new Map<string, BehaviorMapEdge>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of graph.edges) {
      const sourceVisualIds = visualNodesByCanonicalId.get(edge.source);
      const canonicalTarget = canonicalNodesById.get(edge.target);
      if (!sourceVisualIds || !canonicalTarget) continue;

      for (const sourceVisualId of sourceVisualIds) {
        const targetVisualNode = addVisualNode(canonicalTarget, isDuplicableVisualKind(canonicalTarget.kind) ? sourceVisualId : undefined);
        const before = edges.size;
        addEdgeByNodeIds(edges, sourceVisualId, targetVisualNode.id, edge.kind, edge.sourceField);
        if (edges.size !== before) changed = true;
      }
    }
  }

  return { nodes: [...nodes.values()].sort(compareNodes), edges: [...edges.values()].sort(compareEdges) };
}

function makeVisualNodeId(kind: BehaviorMapNodeKind, canonicalId: string, visualParentId?: string): string {
  // Workflows and capabilities are visual containment nodes in the Behavior Map.
  // Parent-scoped ids keep duplicate visual instances local without changing the canonical model entity.
  if ((kind === 'workflow' || kind === 'aggregated-workflow' || kind === 'capability') && visualParentId) return `${canonicalId}@@parent:${visualParentId}`;
  return canonicalId;
}

function isDuplicableVisualKind(kind: BehaviorMapNodeKind): boolean {
  return kind === 'workflow' || kind === 'aggregated-workflow' || kind === 'capability';
}

function nodeKindForScope(scope: string): BehaviorMapNodeKind | undefined {
  if (scope === 'semantic-areas') return 'semantic-area';
  if (scope === 'workflows') return 'workflow';
  if (scope === 'capabilities') return 'capability';
  if (scope === 'events') return 'event';
  if (scope === 'entities') return 'entity';
  if (scope === 'state-machines') return 'state-machine';
  if (scope === 'decisions') return 'decision';
  return undefined;
}

function isValidNodeKindForScope(kind: BehaviorMapNodeKind, scope: string): boolean {
  return nodeKindForScope(scope) === kind || (scope === 'workflows' && kind === 'aggregated-workflow');
}

function isRelatedModelScope(scope: string): boolean {
  return scope === 'capabilities' || scope === 'events' || scope === 'entities' || scope === 'state-machines' || scope === 'decisions';
}

export function validateBehaviorMapGraph(graph: BehaviorMapGraph, artifactRefs?: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();

  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) problems.push(`duplicate node id: ${node.id}`);
    nodeIds.add(node.id);

    const parsed = parseBehaviorMapRef(node.ref);
    if (!parsed) problems.push(`invalid node ref: ${node.id} -> ${node.ref}`);
    else if (node.kind !== 'manifest' && !isValidNodeKindForScope(node.kind, parsed.scope)) problems.push(`node kind/scope mismatch: ${node.id} -> ${node.ref}`);

    if (artifactRefs && node.kind !== 'manifest' && !artifactRefs.has(node.ref)) problems.push(`node ref missing artifact: ${node.id} -> ${node.ref}`);
  }

  for (const edge of graph.edges) {
    if (edgeIds.has(edge.id)) problems.push(`duplicate edge id: ${edge.id}`);
    edgeIds.add(edge.id);
    if (!nodeIds.has(edge.source)) problems.push(`edge source missing node: ${edge.id} -> ${edge.source}`);
    if (!nodeIds.has(edge.target)) problems.push(`edge target missing node: ${edge.id} -> ${edge.target}`);
  }

  return problems;
}

function summarizeDiagnostics(diagnostics: readonly DiagnosticViewModel[], entities: readonly PathDerivedModelEntity[]) {
  const byPath = new Map(entities.map((entity) => [entity.filePath, toRef(entity.scope, entity.identity)]));
  const result = new Map<string, { errors: number; warnings: number; info: number }>();
  for (const diagnostic of diagnostics) {
    if (!diagnostic.filePath) continue;
    const ref = byPath.get(diagnostic.filePath);
    if (!ref) continue;
    const summary = result.get(ref) ?? { errors: 0, warnings: 0, info: 0 };
    if (diagnostic.severity === 'error') summary.errors += 1;
    else if (diagnostic.severity === 'warning') summary.warnings += 1;
    else summary.info += 1;
    result.set(ref, summary);
  }
  return result;
}

function uniqueSorted(values: readonly string[]) { return [...new Set(values)].sort((a, b) => a.localeCompare(b)); }
function compareNodes(a: BehaviorMapNode, b: BehaviorMapNode) { return a.kind.localeCompare(b.kind) || a.ref.localeCompare(b.ref) || a.id.localeCompare(b.id); }
function compareEdges(a: BehaviorMapEdge, b: BehaviorMapEdge) { return a.id.localeCompare(b.id); }
