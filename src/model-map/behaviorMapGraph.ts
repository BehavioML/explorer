import type {
  DiagnosticViewModel,
  EntitySummaryViewModel,
  PathDerivedEntityIndex,
  PathDerivedModelEntity,
  SemanticReferenceIndexViewModel,
} from '../core';

export type BehaviorMapNodeKind = 'semantic-area' | 'workflow' | 'capability';
export type WorkflowVisualSubtype = 'regular' | 'aggregated';

export type BehaviorMapNode = {
  id: string;
  ref: string;
  kind: BehaviorMapNodeKind;
  label: string;
  sizeWeight: number;
  workflowSubtype?: WorkflowVisualSubtype;
  diagnostics?: { errors: number; warnings: number; info: number };
};

export type BehaviorMapEdgeKind =
  | 'semantic-area-contains-workflow'
  | 'aggregated-workflow-contains-workflow'
  | 'workflow-uses-capability';

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
}

const NODE_SCOPE_BY_KIND = {
  'semantic-area': 'semantic-areas',
  workflow: 'workflows',
  capability: 'capabilities',
} as const;

export function createBehaviorMapGraph(input: CreateBehaviorMapGraphInput): BehaviorMapGraph {
  const artifactByRef = new Map(input.entityIndex.entities.map((entity) => [toRef(entity.scope, entity.identity), entity]));
  const nodes = new Map<string, BehaviorMapNode>();
  const edges = new Map<string, BehaviorMapEdge>();
  const diagnosticsByRef = summarizeDiagnostics(input.diagnostics ?? [], input.entityIndex.entities);
  const semanticAreaSummaries = (input.entitySummaries ?? []).filter((summary) => summary.scope === 'semantic-areas');

  for (const area of input.entityIndex.entities.filter((entity) => entity.scope === 'semantic-areas')) {
    const summary = semanticAreaSummaries.find((candidate) => candidate.identity === area.identity);
    const workflowRefs = getSemanticAreaWorkflowReferences(summary, input.referenceIndex, area);
    addNode(nodes, createNode(area, 'semantic-area', workflowRefs.length || 1, diagnosticsByRef));

    if (!input.expansion?.expandedNodeIds.has(toNodeId('semantic-area', area))) {
      continue;
    }

    for (const workflowRef of workflowRefs) {
      const workflow = artifactByRef.get(toRef('workflows', workflowRef));
      if (!workflow) {
        continue;
      }
      addWorkflowNode(nodes, workflow, input.referenceIndex, diagnosticsByRef);
      addEdge(edges, area, workflow, 'semantic-area-contains-workflow', 'workflows[]');
    }
  }

  const processedExpandedWorkflows = new Set<string>();
  let addedExpandedWorkflow = true;
  while (addedExpandedWorkflow) {
    addedExpandedWorkflow = false;
    const expandedWorkflows = [...nodes.values()].filter(
      (node) =>
        node.kind === 'workflow' &&
        input.expansion?.expandedNodeIds.has(node.id) &&
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
          addWorkflowNode(nodes, child, input.referenceIndex, diagnosticsByRef);
          addEdge(edges, workflow, child, 'aggregated-workflow-contains-workflow', reference.fieldPath);
          addedExpandedWorkflow = true;
        }
        if (reference.targetScope === 'capabilities' && isStepCapabilityField(reference.fieldPath)) {
          const capability = artifactByRef.get(toRef('capabilities', reference.targetIdentity));
          if (!capability) continue;
          addNode(nodes, createNode(capability, 'capability', 1, diagnosticsByRef));
          addEdge(edges, workflow, capability, 'workflow-uses-capability', reference.fieldPath);
        }
      }
    }
  }

  return { nodes: [...nodes.values()].sort(compareNodes), edges: [...edges.values()].sort(compareEdges) };
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
) {
  const subtype = (referenceIndex?.outgoingReferences ?? []).some(
    (reference) =>
      reference.source.scope === 'workflows' &&
      reference.source.identity === workflow.identity &&
      reference.targetScope === 'workflows' &&
      reference.resolved &&
      isAggregateWorkflowField(reference.fieldPath),
  )
    ? 'aggregated'
    : 'regular';
  addNode(nodes, { ...createNode(workflow, 'workflow', 1, diagnosticsByRef), workflowSubtype: subtype });
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

function createNode(
  entity: PathDerivedModelEntity,
  kind: BehaviorMapNodeKind,
  sizeWeight: number,
  diagnosticsByRef: Map<string, BehaviorMapNode['diagnostics']>,
): BehaviorMapNode {
  const ref = toRef(entity.scope, entity.identity);
  return {
    id: toNodeId(kind, entity),
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
  if (NODE_SCOPE_BY_KIND[node.kind] === parseBehaviorMapRef(node.ref)?.scope) nodes.set(node.id, node);
}

function addEdge(edges: Map<string, BehaviorMapEdge>, source: PathDerivedModelEntity, target: PathDerivedModelEntity, kind: BehaviorMapEdgeKind, sourceField: string) {
  const sourceKind = nodeKindForScope(source.scope);
  const targetKind = nodeKindForScope(target.scope);
  if (!sourceKind || !targetKind) return;

  const edge = {
    id: `${kind}:${source.scope}/${source.identity}->${target.scope}/${target.identity}:${sourceField}`,
    source: toNodeId(sourceKind, source),
    target: toNodeId(targetKind, target),
    kind,
    explicit: true as const,
    sourceField,
  };
  edges.set(edge.id, edge);
}

function nodeKindForScope(scope: string): BehaviorMapNodeKind | undefined {
  if (scope === 'semantic-areas') return 'semantic-area';
  if (scope === 'workflows') return 'workflow';
  if (scope === 'capabilities') return 'capability';
  return undefined;
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
    else if (nodeKindForScope(parsed.scope) !== node.kind) problems.push(`node kind/scope mismatch: ${node.id} -> ${node.ref}`);

    if (artifactRefs && !artifactRefs.has(node.ref)) problems.push(`node ref missing artifact: ${node.id} -> ${node.ref}`);
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
function compareNodes(a: BehaviorMapNode, b: BehaviorMapNode) { return a.kind.localeCompare(b.kind) || a.ref.localeCompare(b.ref); }
function compareEdges(a: BehaviorMapEdge, b: BehaviorMapEdge) { return a.id.localeCompare(b.id); }
