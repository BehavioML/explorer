import assert from 'node:assert/strict';
import test from 'node:test';
import {
  activateWorkspaceDocument,
  createEntityWorkspaceDocumentId,
  createInitialWorkspaceDocumentState,
  openEntityWorkspaceDocument,
  setActiveEntityWorkspaceDocumentView,
} from '../src/ui-react/workspaceDocuments';
import {
  createPathDerivedEntityIndex,
  createRelationshipNavigationTarget,
  type PathDerivedEntityKey,
  type SemanticReferenceViewModel,
} from '../src/core';

const searchWorkspace: PathDerivedEntityKey = {
  scope: 'capabilities',
  identity: 'search/search_workspace',
};

const runValidation: PathDerivedEntityKey = {
  scope: 'capabilities',
  identity: 'validation/run_validation',
};

test('workspace document state starts with the overview document active', () => {
  const state = createInitialWorkspaceDocumentState();

  assert.deepEqual(state, {
    documents: [{ kind: 'overview', id: 'overview' }],
    activeDocumentId: 'overview',
  });
});

test('opening first entity creates an active source document', () => {
  const state = openEntityWorkspaceDocument(createInitialWorkspaceDocumentState(), searchWorkspace);

  assert.equal(state.activeDocumentId, 'entity:capabilities:search/search_workspace');
  assert.deepEqual(state.documents, [
    { kind: 'overview', id: 'overview' },
    {
      kind: 'entity',
      id: 'entity:capabilities:search/search_workspace',
      scope: 'capabilities',
      identity: 'search/search_workspace',
      activeView: 'source',
    },
  ]);
});

test('opening the same entity activates existing document without duplication', () => {
  const firstState = openEntityWorkspaceDocument(createInitialWorkspaceDocumentState(), searchWorkspace);
  const secondState = openEntityWorkspaceDocument(firstState, runValidation);
  const reopenedState = openEntityWorkspaceDocument(secondState, searchWorkspace);

  assert.equal(reopenedState.activeDocumentId, createEntityWorkspaceDocumentId(searchWorkspace));
  assert.equal(reopenedState.documents.length, 3);
  assert.equal(
    reopenedState.documents.filter((document) => document.id === createEntityWorkspaceDocumentId(searchWorkspace)).length,
    1,
  );
});

test('opening second entity appends another entity document', () => {
  const firstState = openEntityWorkspaceDocument(createInitialWorkspaceDocumentState(), searchWorkspace);
  const secondState = openEntityWorkspaceDocument(firstState, runValidation);

  assert.deepEqual(
    secondState.documents.map((document) => document.id),
    ['overview', 'entity:capabilities:search/search_workspace', 'entity:capabilities:validation/run_validation'],
  );
  assert.equal(secondState.activeDocumentId, 'entity:capabilities:validation/run_validation');
});

test('selecting overview activates the overview workspace document', () => {
  const entityState = openEntityWorkspaceDocument(createInitialWorkspaceDocumentState(), searchWorkspace);
  const overviewState = activateWorkspaceDocument(entityState, 'overview');

  assert.equal(overviewState.activeDocumentId, 'overview');
});

test('entity documents keep per-document active view', () => {
  const entityState = openEntityWorkspaceDocument(createInitialWorkspaceDocumentState(), searchWorkspace);
  const relationshipsState = setActiveEntityWorkspaceDocumentView(entityState, 'relationships');

  assert.deepEqual(relationshipsState.documents[1], {
    kind: 'entity',
    id: 'entity:capabilities:search/search_workspace',
    scope: 'capabilities',
    identity: 'search/search_workspace',
    activeView: 'relationships',
  });
});

test('new workspace reset clears entity documents and restores overview', () => {
  const entityState = openEntityWorkspaceDocument(createInitialWorkspaceDocumentState(), searchWorkspace);

  assert.notDeepEqual(entityState, createInitialWorkspaceDocumentState());
  assert.deepEqual(createInitialWorkspaceDocumentState(), {
    documents: [{ kind: 'overview', id: 'overview' }],
    activeDocumentId: 'overview',
  });
});


test('relationship navigation can open an entity document through the existing target path', () => {
  const index = createPathDerivedEntityIndex([
    { path: 'workflows/search_workspace.yaml', content: '' },
    { path: 'capabilities/validation/run_validation.yaml', content: '' },
  ]);
  const reference: SemanticReferenceViewModel = {
    source: {
      scope: 'workflows',
      identity: 'search_workspace',
      filePath: 'workflows/search_workspace.yaml',
    },
    fieldPath: 'steps[0].capability',
    targetScope: 'capabilities',
    targetIdentity: 'validation/run_validation',
    target: {
      scope: 'capabilities',
      identity: 'validation/run_validation',
      filePath: 'capabilities/validation/run_validation.yaml',
    },
    resolved: true,
  };

  const navigationTarget = createRelationshipNavigationTarget(index, reference, 'target');

  assert.equal(navigationTarget.status, 'matched_entity');
  if (navigationTarget.status !== 'matched_entity') {
    return;
  }

  const state = openEntityWorkspaceDocument(
    createInitialWorkspaceDocumentState(),
    navigationTarget.entityKey,
  );

  assert.equal(state.activeDocumentId, 'entity:capabilities:validation/run_validation');
  assert.equal(state.documents.length, 2);
});
