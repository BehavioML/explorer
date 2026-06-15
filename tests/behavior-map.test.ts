import assert from 'node:assert/strict';
import test from 'node:test';
import { createPathDerivedEntityIndex, type SemanticReferenceIndexViewModel, type SemanticReferenceViewModel, type WorkspaceFileEntry } from '../src/core';
import { createBehaviorMapGraph, toBehaviorMapNodeId, validateBehaviorMapGraph } from '../src/model-map/behaviorMapGraph';
import { layoutBehaviorMapGraph, type BehaviorMapLayoutNode } from '../src/model-map/behaviorMapLayout';

const files: readonly WorkspaceFileEntry[] = [
  file('semantic-areas/customer.yaml'),
  file('workflows/customer/onboard.yaml'),
  file('workflows/customer/verify.yaml'),
  file('workflows/customer/child.yaml'),
  file('capabilities/customer/check_identity.yaml'),
  file('capabilities/customer/send_email.yaml'),
];

const referenceIndex: SemanticReferenceIndexViewModel = {
  entities: [],
  outgoingReferences: [
    ref('semantic-areas', 'customer', 'workflows[0]', 'workflows', 'customer/onboard'),
    ref('semantic-areas', 'customer', 'workflows[1]', 'workflows', 'customer/verify'),
    ref('workflows', 'customer/onboard', 'steps[0].workflow', 'workflows', 'customer/child'),
    ref('workflows', 'customer/onboard', 'steps[1].capability', 'capabilities', 'customer/check_identity'),
    ref('workflows', 'customer/onboard', 'steps[2].capability', 'capabilities', 'customer/send_email'),
    ref('workflows', 'customer/verify', 'steps[0].capability', 'capabilities', 'customer/check_identity'),
  ],
  incomingReferences: [],
  unresolvedReferences: [],
};

const expanded = new Set([
  toBehaviorMapNodeId('semantic-area', 'semantic-areas', 'customer'),
  toBehaviorMapNodeId('aggregated-workflow', 'workflows', 'customer/onboard'),
  toBehaviorMapNodeId('workflow', 'workflows', 'customer/verify'),
]);

test('behavior map graph has stable ids, valid endpoints, valid scopes, and only visible semantic nodes', () => {
  const entityIndex = createPathDerivedEntityIndex(files);
  const graph = createBehaviorMapGraph({ entityIndex, referenceIndex, expansion: { expandedNodeIds: expanded } });
  const artifactRefs = new Set(entityIndex.entities.map((entity) => `${entity.scope}/${entity.identity}`));

  assert.deepEqual(validateBehaviorMapGraph(graph, artifactRefs), []);
  assert.equal(new Set(graph.nodes.map((node) => node.id)).size, graph.nodes.length);
  assert.equal(new Set(graph.edges.map((edge) => edge.id)).size, graph.edges.length);
  assert.ok(graph.edges.every((edge) => graph.nodes.some((node) => node.id === edge.source) && graph.nodes.some((node) => node.id === edge.target)));
  assert.ok(graph.nodes.some((node) => node.kind === 'manifest' && node.label === 'BehavioML manifest'));
  assert.ok(graph.edges.some((edge) => edge.kind === 'manifest-contains-semantic-area'));
  assert.ok(graph.nodes.every((node) => ['manifest', 'semantic-area', 'aggregated-workflow', 'workflow', 'capability'].includes(node.kind)));
});

test('behavior map layout assigns finite separated positions and includes node extents in bounds', () => {
  const graph = createBehaviorMapGraph({ entityIndex: createPathDerivedEntityIndex(files), referenceIndex, expansion: { expandedNodeIds: expanded } });
  const layout = layoutBehaviorMapGraph(graph);

  assert.equal(layout.nodes.length, graph.nodes.length);
  assert.ok(layout.nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y)));
  assertDistinctSiblingPositions(layout.nodes, graph.edges.filter((edge) => edge.source === toBehaviorMapNodeId('semantic-area', 'semantic-areas', 'customer')).map((edge) => edge.target));
  assertDistinctSiblingPositions(layout.nodes, graph.edges.filter((edge) => edge.source === toBehaviorMapNodeId('workflow', 'workflows', 'customer/onboard')).map((edge) => edge.target));

  for (const node of layout.nodes) {
    const halfWidth = node.shape === 'pill' ? node.width / 2 : node.radius;
    const halfHeight = node.shape === 'pill' ? node.height / 2 : node.radius;
    assert.ok(layout.bounds.minX <= node.x - halfWidth);
    assert.ok(layout.bounds.maxX >= node.x + halfWidth);
    assert.ok(layout.bounds.minY <= node.y - halfHeight);
    assert.ok(layout.bounds.maxY >= node.y + halfHeight);
  }

  for (const edge of layout.edges) {
    const source = layout.nodes.find((node) => node.id === edge.source);
    const target = layout.nodes.find((node) => node.id === edge.target);
    assert.ok(source && target);
    assertEndpointTouchesNodeBorder(source, edge.sourceX, edge.sourceY);
    assertEndpointTouchesNodeBorder(target, edge.targetX, edge.targetY);
  }
});

test('shared capabilities are visually duplicated per parent while preserving canonical identity', () => {
  const graph = createBehaviorMapGraph({ entityIndex: createPathDerivedEntityIndex(files), referenceIndex, expansion: { expandedNodeIds: expanded } });
  const canonicalCapabilityId = toBehaviorMapNodeId('capability', 'capabilities', 'customer/check_identity');
  const visualCapabilityNodes = graph.nodes.filter((node) => node.canonicalId === canonicalCapabilityId);

  assert.equal(visualCapabilityNodes.length, 2);
  assert.ok(visualCapabilityNodes.every((node) => node.id !== canonicalCapabilityId));
  const onboardVisualId = `${toBehaviorMapNodeId('aggregated-workflow', 'workflows', 'customer/onboard')}@@parent:${toBehaviorMapNodeId('semantic-area', 'semantic-areas', 'customer')}`;
  const verifyVisualId = `${toBehaviorMapNodeId('workflow', 'workflows', 'customer/verify')}@@parent:${toBehaviorMapNodeId('semantic-area', 'semantic-areas', 'customer')}`;
  assert.deepEqual(visualCapabilityNodes.map((node) => node.visualParentId).sort(), [onboardVisualId, verifyVisualId].sort());
  assert.ok(graph.edges.some((edge) => edge.kind === 'workflow-uses-capability' && edge.source === onboardVisualId && edge.target === `${canonicalCapabilityId}@@parent:${onboardVisualId}`));
  assert.ok(graph.edges.some((edge) => edge.kind === 'workflow-uses-capability' && edge.source === verifyVisualId && edge.target === `${canonicalCapabilityId}@@parent:${verifyVisualId}`));
  assert.ok(visualCapabilityNodes.every((node) => graph.edges.filter((edge) => edge.target === node.id).length === 1));
  assert.deepEqual(validateBehaviorMapGraph(graph), []);
});

test('shared workflows are visually duplicated per parent while preserving canonical identity', () => {
  const graph = createBehaviorMapGraph({
    entityIndex: createPathDerivedEntityIndex(files),
    referenceIndex: {
      ...referenceIndex,
      outgoingReferences: [
        ...referenceIndex.outgoingReferences,
        ref('workflows', 'customer/onboard', 'steps[3].workflow', 'workflows', 'customer/verify'),
      ],
    },
    expansion: { expandedNodeIds: expanded },
  });
  const canonicalVerifyId = toBehaviorMapNodeId('workflow', 'workflows', 'customer/verify');
  const visualVerifyNodes = graph.nodes.filter((node) => node.canonicalId === canonicalVerifyId);

  assert.equal(visualVerifyNodes.length, 2);
  assert.ok(visualVerifyNodes.every((node) => node.id !== canonicalVerifyId));
  const semanticAreaId = toBehaviorMapNodeId('semantic-area', 'semantic-areas', 'customer');
  const onboardVisualId = `${toBehaviorMapNodeId('aggregated-workflow', 'workflows', 'customer/onboard')}@@parent:${semanticAreaId}`;
  assert.deepEqual(visualVerifyNodes.map((node) => node.visualParentId).sort(), [onboardVisualId, semanticAreaId].sort());
  assert.ok(graph.edges.some((edge) => edge.kind === 'aggregated-workflow-contains-workflow' && edge.source === onboardVisualId && edge.target === `${canonicalVerifyId}@@parent:${onboardVisualId}`));
  assert.deepEqual(validateBehaviorMapGraph(graph), []);
});

function assertDistinctSiblingPositions(nodes: readonly BehaviorMapLayoutNode[], childIds: readonly string[]) {
  const positions = childIds.map((id) => {
    const node = nodes.find((candidate) => candidate.id === id);
    assert.ok(node, `missing layout node ${id}`);
    return `${node.x},${node.y}`;
  });
  assert.equal(new Set(positions).size, positions.length);
}

function assertEndpointTouchesNodeBorder(node: BehaviorMapLayoutNode, x: number, y: number) {
  const dx = Math.abs(x - node.x);
  const dy = Math.abs(y - node.y);
  if (node.shape === 'circle') {
    assert.ok(Math.abs(Math.hypot(dx, dy) - node.radius) <= 1.1, `circle endpoint for ${node.id} should be on the visible radius`);
    return;
  }
  assert.ok(dx <= node.width / 2 + 1.1, `pill endpoint x for ${node.id} should not overshoot width`);
  assert.ok(dy <= node.height / 2 + 1.1, `pill endpoint y for ${node.id} should not overshoot height`);
  assert.ok(Math.abs(dx - node.width / 2) <= 1.1 || Math.abs(dy - node.height / 2) <= 1.1, `pill endpoint for ${node.id} should touch a visible edge`);
}

function file(path: string): WorkspaceFileEntry { return { path, content: '' }; }

function ref(sourceScope: string, sourceIdentity: string, fieldPath: string, targetScope: string, targetIdentity: string): SemanticReferenceViewModel {
  return {
    source: { scope: sourceScope, identity: sourceIdentity, filePath: `${sourceScope}/${sourceIdentity}.yaml` },
    target: { scope: targetScope, identity: targetIdentity, filePath: `${targetScope}/${targetIdentity}.yaml` },
    sourceFilePath: `${sourceScope}/${sourceIdentity}.yaml`,
    fieldPath,
    targetScope,
    targetIdentity,
    targetFilePath: `${targetScope}/${targetIdentity}.yaml`,
    resolved: true,
  };
}
