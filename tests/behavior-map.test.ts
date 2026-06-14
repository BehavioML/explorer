import assert from 'node:assert/strict';
import test from 'node:test';
import { createPathDerivedEntityIndex, type WorkspaceFileEntry } from '../src/core';
import { createBehaviorMapGraph, toBehaviorMapNodeId } from '../src/model-map/behaviorMapGraph';
import { layoutBehaviorMapGraph } from '../src/model-map/behaviorMapLayout';

const files: WorkspaceFileEntry[] = [
  { path: 'semantic-areas/commerce.yaml', content: '' },
  { path: 'workflows/aggregate/checkout.yaml', content: '' },
  { path: 'workflows/checkout/pay.yaml', content: '' },
  { path: 'capabilities/payment/charge.yaml', content: '' },
  { path: 'roles/user.yaml', content: '' },
  { path: 'events/paid.yaml', content: '' },
];
const entityIndex = createPathDerivedEntityIndex(files);
const referenceIndex = {
  entities: [],
  incomingReferences: [],
  unresolvedReferences: [],
  outgoingReferences: [
    ref('semantic-areas', 'commerce', 'workflows[0]', 'workflows', 'aggregate/checkout'),
    ref('workflows', 'aggregate/checkout', 'steps[0].workflow', 'workflows', 'checkout/pay'),
    ref('workflows', 'checkout/pay', 'steps[0].capability', 'capabilities', 'payment/charge'),
  ],
};

const areaId = toBehaviorMapNodeId('semantic-area', 'semantic-areas', 'commerce');
const aggregateId = toBehaviorMapNodeId('workflow', 'workflows', 'aggregate/checkout');
const childWorkflowId = toBehaviorMapNodeId('workflow', 'workflows', 'checkout/pay');

test('initial graph contains only semantic-area artifact nodes without synthetic roots or groups', () => {
  const graph = createBehaviorMapGraph({ entityIndex, referenceIndex });
  assert.deepEqual(graph.nodes.map((node) => node.kind), ['semantic-area']);
  assert.equal(graph.nodes.some((node) => /root|group|cluster|level/i.test(node.id)), false);
  assertAllNodesMapToArtifacts(graph.nodes.map((node) => node.ref));
});

test('semantic area expansion reveals only directly listed workflows and no direct capabilities', () => {
  const graph = createBehaviorMapGraph({ entityIndex, referenceIndex, expansion: { expandedNodeIds: new Set([areaId]) } });
  assert.deepEqual(graph.nodes.map((node) => [node.kind, node.ref]), [
    ['semantic-area', 'semantic-areas/commerce'],
    ['workflow', 'workflows/aggregate/checkout'],
  ]);
  assert.equal(graph.edges[0].kind, 'semantic-area-contains-workflow');
  assert.equal(graph.nodes.some((node) => node.kind === 'capability'), false);
});

test('aggregated workflows are real workflow artifacts and expand through explicit step workflow refs', () => {
  const graph = createBehaviorMapGraph({ entityIndex, referenceIndex, expansion: { expandedNodeIds: new Set([areaId, aggregateId]) } });
  const aggregate = graph.nodes.find((node) => node.id === aggregateId);
  assert.equal(aggregate?.workflowSubtype, 'aggregated');
  assert.equal(graph.nodes.find((node) => node.id === childWorkflowId)?.workflowSubtype, 'regular');
  assert.equal(graph.edges.some((edge) => edge.kind === 'aggregated-workflow-contains-workflow' && edge.sourceField === 'steps[0].workflow'), true);
  assertAllNodesMapToArtifacts(graph.nodes.map((node) => node.ref));
});

test('workflow expansion reveals only direct step capabilities as deterministic pill layout leaves', () => {
  const expandedNodeIds = new Set([areaId, aggregateId, childWorkflowId]);
  const graph = createBehaviorMapGraph({ entityIndex, referenceIndex, expansion: { expandedNodeIds } });
  assert.equal(graph.nodes.some((node) => ['roles', 'events', 'decisions', 'state-machines', 'modules', 'components', 'entities', 'interfaces'].some((scope) => node.ref.startsWith(`${scope}/`))), false);
  assert.equal(graph.edges.some((edge) => edge.kind === 'workflow-uses-capability' && edge.sourceField === 'steps[0].capability'), true);
  const first = layoutBehaviorMapGraph(graph);
  const second = layoutBehaviorMapGraph(graph);
  assert.deepEqual(second, first);
  assert.equal(first.nodes.find((node) => node.ref === 'capabilities/payment/charge')?.shape, 'pill');
});

function ref(sourceScope: string, sourceIdentity: string, fieldPath: string, targetScope: string, targetIdentity: string) {
  return { source: { scope: sourceScope, identity: sourceIdentity }, fieldPath, targetScope, targetIdentity, resolved: true, target: { scope: targetScope, identity: targetIdentity } };
}

function assertAllNodesMapToArtifacts(refs: readonly string[]) {
  const artifactRefs = new Set(entityIndex.entities.map((entity) => `${entity.scope}/${entity.identity}`));
  for (const nodeRef of refs) assert.equal(artifactRefs.has(nodeRef), true, nodeRef);
}
