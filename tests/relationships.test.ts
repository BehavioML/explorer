import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPathDerivedEntityIndex,
  createRelationshipNavigationTarget,
  createSelectedEntityRelationships,
  findUnresolvedReferencesForDiagnostic,
  groupUnresolvedReferencesByTarget,
  type SemanticReferenceIndexViewModel,
  type SemanticReferenceViewModel,
  type WorkspaceFileEntry,
} from '../src/core';

const files: readonly WorkspaceFileEntry[] = [
  { path: 'workflows/order/process.yaml', content: '' },
  { path: 'capabilities/order/validate.yaml', content: '' },
  { path: 'capabilities/order/check_inventory.yaml', content: '' },
  { path: 'components/order_processor.yaml', content: '' },
];

const referenceIndex: SemanticReferenceIndexViewModel = {
  entities: [
    { scope: 'workflows', identity: 'order/process', filePath: 'workflows/order/process.yaml' },
    { scope: 'capabilities', identity: 'order/validate', filePath: 'capabilities/order/validate.yaml' },
    { scope: 'capabilities', identity: 'order/check_inventory', filePath: 'capabilities/order/check_inventory.yaml' },
    { scope: 'components', identity: 'order_processor', filePath: 'components/order_processor.yaml' },
  ],
  outgoingReferences: [
    resolvedReference({
      sourceScope: 'workflows',
      sourceIdentity: 'order/process',
      sourceFilePath: 'workflows/order/process.yaml',
      fieldPath: 'steps[0]',
      targetScope: 'capabilities',
      targetIdentity: 'order/validate',
      targetFilePath: 'capabilities/order/validate.yaml',
    }),
    resolvedReference({
      sourceScope: 'capabilities',
      sourceIdentity: 'order/validate',
      sourceFilePath: 'capabilities/order/validate.yaml',
      fieldPath: 'uses[0]',
      targetScope: 'capabilities',
      targetIdentity: 'order/check_inventory',
      targetFilePath: 'capabilities/order/check_inventory.yaml',
    }),
    unresolvedReference({
      sourceScope: 'workflows',
      sourceIdentity: 'order/process',
      sourceFilePath: 'workflows/order/process.yaml',
      fieldPath: 'steps[1]',
      targetScope: 'capabilities',
      targetIdentity: 'order/missing',
    }),
  ],
  incomingReferences: [
    resolvedReference({
      sourceScope: 'workflows',
      sourceIdentity: 'order/process',
      sourceFilePath: 'workflows/order/process.yaml',
      fieldPath: 'steps[0]',
      targetScope: 'capabilities',
      targetIdentity: 'order/validate',
      targetFilePath: 'capabilities/order/validate.yaml',
    }),
    resolvedReference({
      sourceScope: 'components',
      sourceIdentity: 'order_processor',
      sourceFilePath: 'components/order_processor.yaml',
      fieldPath: 'implements.capabilities[0]',
      targetScope: 'capabilities',
      targetIdentity: 'order/validate',
      targetFilePath: 'capabilities/order/validate.yaml',
    }),
    resolvedReference({
      sourceScope: 'capabilities',
      sourceIdentity: 'order/validate',
      sourceFilePath: 'capabilities/order/validate.yaml',
      fieldPath: 'uses[0]',
      targetScope: 'capabilities',
      targetIdentity: 'order/check_inventory',
      targetFilePath: 'capabilities/order/check_inventory.yaml',
    }),
  ],
  unresolvedReferences: [
    unresolvedReference({
      sourceScope: 'workflows',
      sourceIdentity: 'order/process',
      sourceFilePath: 'workflows/order/process.yaml',
      fieldPath: 'steps[1]',
      targetScope: 'capabilities',
      targetIdentity: 'order/missing',
    }),
    unresolvedReference({
      sourceScope: 'components',
      sourceIdentity: 'order_processor',
      sourceFilePath: 'components/order_processor.yaml',
      fieldPath: 'implements.capabilities[1]',
      targetScope: 'capabilities',
      targetIdentity: 'order/missing',
    }),
  ],
};

test('relationship view model includes outgoing references for selected entity', () => {
  const index = createPathDerivedEntityIndex(files);
  const selected = index.entities.find((entity) => entity.scope === 'workflows' && entity.identity === 'order/process');
  const relationships = createSelectedEntityRelationships(referenceIndex, selected);

  assert.equal(relationships?.outgoingReferences.length, 2);
  assert.deepEqual(
    relationships?.outgoingReferences.map((reference) => `${reference.fieldPath}->${reference.targetScope}:${reference.targetIdentity}`),
    ['steps[0]->capabilities:order/validate', 'steps[1]->capabilities:order/missing'],
  );
});

test('relationship view model includes incoming references for selected entity', () => {
  const index = createPathDerivedEntityIndex(files);
  const selected = index.entities.find((entity) => entity.scope === 'capabilities' && entity.identity === 'order/validate');
  const relationships = createSelectedEntityRelationships(referenceIndex, selected);

  assert.deepEqual(
    relationships?.incomingReferences.map((reference) => `${reference.source.scope}:${reference.source.identity}:${reference.fieldPath}`),
    ['workflows:order/process:steps[0]', 'components:order_processor:implements.capabilities[0]'],
  );
});

test('unresolved references are grouped by target', () => {
  const groups = groupUnresolvedReferencesByTarget(referenceIndex.unresolvedReferences);

  assert.deepEqual(groups, [
    {
      targetScope: 'capabilities',
      targetIdentity: 'order/missing',
      references: referenceIndex.unresolvedReferences,
    },
  ]);
});

test('outgoing reference navigation maps to the target entity', () => {
  const index = createPathDerivedEntityIndex(files);
  const navigationTarget = createRelationshipNavigationTarget(
    index,
    referenceIndex.outgoingReferences[0],
    'target',
  );

  assert.deepEqual(navigationTarget, {
    status: 'matched_entity',
    entityKey: { scope: 'capabilities', identity: 'order/validate' },
  });
});

test('incoming backlink navigation maps to the source referrer entity', () => {
  const index = createPathDerivedEntityIndex(files);
  const navigationTarget = createRelationshipNavigationTarget(
    index,
    referenceIndex.incomingReferences[1],
    'source',
  );

  assert.deepEqual(navigationTarget, {
    status: 'matched_entity',
    entityKey: { scope: 'components', identity: 'order_processor' },
  });
});

test('unresolved reference does not navigate as a resolved target', () => {
  const index = createPathDerivedEntityIndex(files);
  const navigationTarget = createRelationshipNavigationTarget(
    index,
    referenceIndex.unresolvedReferences[0],
    'target',
  );

  assert.deepEqual(navigationTarget, { status: 'unresolved_reference' });
});

test('source navigation works when the reference target is unresolved', () => {
  const index = createPathDerivedEntityIndex(files);
  const navigationTarget = createRelationshipNavigationTarget(
    index,
    referenceIndex.unresolvedReferences[0],
    'source',
  );

  assert.deepEqual(navigationTarget, {
    status: 'matched_entity',
    entityKey: { scope: 'workflows', identity: 'order/process' },
  });
});

test('missing relationship target is handled gracefully', () => {
  const index = createPathDerivedEntityIndex(files);
  const reference = {
    ...referenceIndex.outgoingReferences[0],
    target: undefined,
  };
  const navigationTarget = createRelationshipNavigationTarget(index, reference, 'target');

  assert.deepEqual(navigationTarget, { status: 'missing_target' });
});

test('missing relationship source is handled gracefully', () => {
  const index = createPathDerivedEntityIndex(files);
  const reference = {
    ...referenceIndex.incomingReferences[0],
    source: undefined,
  } as unknown as SemanticReferenceViewModel;
  const navigationTarget = createRelationshipNavigationTarget(index, reference, 'source');

  assert.deepEqual(navigationTarget, { status: 'missing_source' });
});

test('unmatched relationship source is handled gracefully', () => {
  const index = createPathDerivedEntityIndex(
    files.filter((file) => file.path !== 'components/order_processor.yaml'),
  );
  const navigationTarget = createRelationshipNavigationTarget(
    index,
    referenceIndex.incomingReferences[1],
    'source',
  );

  assert.deepEqual(navigationTarget, { status: 'unmatched_source' });
});

test('unmatched relationship target is handled gracefully', () => {
  const index = createPathDerivedEntityIndex(
    files.filter((file) => file.path !== 'capabilities/order/validate.yaml'),
  );
  const navigationTarget = createRelationshipNavigationTarget(
    index,
    referenceIndex.outgoingReferences[0],
    'target',
  );

  assert.deepEqual(navigationTarget, { status: 'unmatched_target' });
});

test('diagnostic relationship matching normalizes source file paths', () => {
  const index = createPathDerivedEntityIndex(files);
  const selected = index.entities.find((entity) => entity.scope === 'workflows' && entity.identity === 'order/process');
  const relationships = createSelectedEntityRelationships(referenceIndex, selected);
  const relatedReferences = findUnresolvedReferencesForDiagnostic(
    { filePath: 'workflows\\order\\process.yaml', fieldPath: 'steps[1]' },
    relationships,
  );

  assert.deepEqual(
    relatedReferences.map((reference) => `${reference.source.filePath}:${reference.fieldPath}`),
    ['workflows/order/process.yaml:steps[1]'],
  );
});


test('semantic-area relationships use Validator referenceIndex outgoing workflow references', () => {
  const semanticFiles: readonly WorkspaceFileEntry[] = [
    { path: 'semantic-areas/packet/protected_receive.yaml', content: 'name: Area' },
    { path: 'workflows/packet/endpoint/receive_protected_packet.yaml', content: 'name: Workflow' },
  ];
  const index = createPathDerivedEntityIndex(semanticFiles);
  const selected = index.entities.find(
    (entity) => entity.scope === 'semantic-areas' && entity.identity === 'packet/protected_receive',
  );
  const relationships = createSelectedEntityRelationships(semanticAreaReferenceIndex, selected);

  assert.deepEqual(
    relationships?.outgoingReferences.map(
      (reference) => `${reference.fieldPath}->${reference.targetScope}:${reference.targetIdentity}`,
    ),
    [
      'workflows[0]->workflows:packet/endpoint/receive_protected_packet',
      'workflows[1]->workflows:packet/endpoint/missing',
    ],
  );
});

test('workflow relationships include incoming Validator backlink from semantic area', () => {
  const semanticFiles: readonly WorkspaceFileEntry[] = [
    { path: 'semantic-areas/packet/protected_receive.yaml', content: 'name: Area' },
    { path: 'workflows/packet/endpoint/receive_protected_packet.yaml', content: 'name: Workflow' },
  ];
  const index = createPathDerivedEntityIndex(semanticFiles);
  const selected = index.entities.find(
    (entity) => entity.scope === 'workflows' && entity.identity === 'packet/endpoint/receive_protected_packet',
  );
  const relationships = createSelectedEntityRelationships(semanticAreaReferenceIndex, selected);

  assert.deepEqual(
    relationships?.incomingReferences.map(
      (reference) => `${reference.source.scope}:${reference.source.identity}:${reference.fieldPath}`,
    ),
    ['semantic-areas:packet/protected_receive:workflows[0]'],
  );
});

test('unresolved semantic-area workflow references render as unresolved references', () => {
  const semanticFiles: readonly WorkspaceFileEntry[] = [
    { path: 'semantic-areas/packet/protected_receive.yaml', content: 'name: Area' },
  ];
  const index = createPathDerivedEntityIndex(semanticFiles);
  const selected = index.entities.find(
    (entity) => entity.scope === 'semantic-areas' && entity.identity === 'packet/protected_receive',
  );
  const relationships = createSelectedEntityRelationships(semanticAreaReferenceIndex, selected);

  assert.deepEqual(
    relationships?.unresolvedReferences.map(
      (reference) => `${reference.fieldPath}->${reference.targetScope}:${reference.targetIdentity}:${reference.resolved}`,
    ),
    ['workflows[1]->workflows:packet/endpoint/missing:false'],
  );
  assert.deepEqual(relationships?.unresolvedReferencesByTarget, [
    {
      targetScope: 'workflows',
      targetIdentity: 'packet/endpoint/missing',
      references: [semanticAreaReferenceIndex.unresolvedReferences[0]],
    },
  ]);
});

test('semantic-area relationship navigation only matches existing path-derived entities', () => {
  const completeIndex = createPathDerivedEntityIndex([
    { path: 'semantic-areas/packet/protected_receive.yaml', content: 'name: Area' },
    { path: 'workflows/packet/endpoint/receive_protected_packet.yaml', content: 'name: Workflow' },
  ]);
  const semanticOnlyIndex = createPathDerivedEntityIndex([
    { path: 'semantic-areas/packet/protected_receive.yaml', content: 'name: Area' },
  ]);

  assert.deepEqual(
    createRelationshipNavigationTarget(
      completeIndex,
      semanticAreaReferenceIndex.outgoingReferences[0],
      'target',
    ),
    {
      status: 'matched_entity',
      entityKey: { scope: 'workflows', identity: 'packet/endpoint/receive_protected_packet' },
    },
  );
  assert.deepEqual(
    createRelationshipNavigationTarget(
      semanticOnlyIndex,
      semanticAreaReferenceIndex.outgoingReferences[0],
      'target',
    ),
    { status: 'unmatched_target' },
  );
  assert.deepEqual(
    createRelationshipNavigationTarget(
      completeIndex,
      semanticAreaReferenceIndex.incomingReferences[0],
      'source',
    ),
    {
      status: 'matched_entity',
      entityKey: { scope: 'semantic-areas', identity: 'packet/protected_receive' },
    },
  );
});

const semanticAreaReferenceIndex: SemanticReferenceIndexViewModel = {
  entities: [
    {
      scope: 'semantic-areas',
      identity: 'packet/protected_receive',
      filePath: 'semantic-areas/packet/protected_receive.yaml',
    },
    {
      scope: 'workflows',
      identity: 'packet/endpoint/receive_protected_packet',
      filePath: 'workflows/packet/endpoint/receive_protected_packet.yaml',
    },
  ],
  outgoingReferences: [
    resolvedReference({
      sourceScope: 'semantic-areas',
      sourceIdentity: 'packet/protected_receive',
      sourceFilePath: 'semantic-areas/packet/protected_receive.yaml',
      fieldPath: 'workflows[0]',
      targetScope: 'workflows',
      targetIdentity: 'packet/endpoint/receive_protected_packet',
      targetFilePath: 'workflows/packet/endpoint/receive_protected_packet.yaml',
    }),
    unresolvedReference({
      sourceScope: 'semantic-areas',
      sourceIdentity: 'packet/protected_receive',
      sourceFilePath: 'semantic-areas/packet/protected_receive.yaml',
      fieldPath: 'workflows[1]',
      targetScope: 'workflows',
      targetIdentity: 'packet/endpoint/missing',
    }),
  ],
  incomingReferences: [
    resolvedReference({
      sourceScope: 'semantic-areas',
      sourceIdentity: 'packet/protected_receive',
      sourceFilePath: 'semantic-areas/packet/protected_receive.yaml',
      fieldPath: 'workflows[0]',
      targetScope: 'workflows',
      targetIdentity: 'packet/endpoint/receive_protected_packet',
      targetFilePath: 'workflows/packet/endpoint/receive_protected_packet.yaml',
    }),
  ],
  unresolvedReferences: [
    unresolvedReference({
      sourceScope: 'semantic-areas',
      sourceIdentity: 'packet/protected_receive',
      sourceFilePath: 'semantic-areas/packet/protected_receive.yaml',
      fieldPath: 'workflows[1]',
      targetScope: 'workflows',
      targetIdentity: 'packet/endpoint/missing',
    }),
  ],
};

function resolvedReference(input: {
  readonly sourceScope: string;
  readonly sourceIdentity: string;
  readonly sourceFilePath: string;
  readonly fieldPath: string;
  readonly targetScope: string;
  readonly targetIdentity: string;
  readonly targetFilePath: string;
}): SemanticReferenceViewModel {
  return {
    source: { scope: input.sourceScope, identity: input.sourceIdentity, filePath: input.sourceFilePath },
    fieldPath: input.fieldPath,
    targetScope: input.targetScope,
    targetIdentity: input.targetIdentity,
    resolved: true,
    target: { scope: input.targetScope, identity: input.targetIdentity, filePath: input.targetFilePath },
  };
}

function unresolvedReference(input: {
  readonly sourceScope: string;
  readonly sourceIdentity: string;
  readonly sourceFilePath: string;
  readonly fieldPath: string;
  readonly targetScope: string;
  readonly targetIdentity: string;
}): SemanticReferenceViewModel {
  return {
    source: { scope: input.sourceScope, identity: input.sourceIdentity, filePath: input.sourceFilePath },
    fieldPath: input.fieldPath,
    targetScope: input.targetScope,
    targetIdentity: input.targetIdentity,
    resolved: false,
  };
}
