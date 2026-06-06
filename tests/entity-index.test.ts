import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPathDerivedEntityIndex,
  findSelectedEntity,
  getDefaultEntitySelection,
  type WorkspaceFileEntry,
} from '../src/core';

test('derives nested entity identities from paths under known scopes', () => {
  const index = createPathDerivedEntityIndex([
    file('capabilities/connection/send_initial.yaml'),
    file('workflows/customer/onboarding/main.yaml'),
    file('semantic-areas/packet/protected_receive.yaml'),
  ]);

  assert.deepEqual(
    index.entities.map((entity) => ({
      scope: entity.scope,
      identity: entity.identity,
      filePath: entity.filePath,
      displayName: entity.displayName,
      extension: entity.extension,
    })),
    [
      {
        scope: 'workflows',
        identity: 'customer/onboarding/main',
        filePath: 'workflows/customer/onboarding/main.yaml',
        displayName: 'main',
        extension: '.yaml',
      },
      {
        scope: 'capabilities',
        identity: 'connection/send_initial',
        filePath: 'capabilities/connection/send_initial.yaml',
        displayName: 'send_initial',
        extension: '.yaml',
      },
      {
        scope: 'semantic-areas',
        identity: 'packet/protected_receive',
        filePath: 'semantic-areas/packet/protected_receive.yaml',
        displayName: 'protected_receive',
        extension: '.yaml',
      },
    ],
  );
});

test('recognizes yaml, yml, and json model entity files', () => {
  const index = createPathDerivedEntityIndex([
    file('roles/admin.yaml'),
    file('events/order-created.yml'),
    file('modules/billing.json'),
  ]);

  assert.deepEqual(
    index.entities.map((entity) => [entity.identity, entity.extension]),
    [
      ['admin', '.yaml'],
      ['billing', '.json'],
      ['order-created', '.yml'],
    ],
  );
});

test('ignores unknown directories', () => {
  const index = createPathDerivedEntityIndex([
    file('generated/reports/workflows.json'),
    file('supporting/specs/roles.yaml'),
    file('docs/overview.yml'),
    file('roles/admin.yaml'),
  ]);

  assert.deepEqual(
    index.entities.map((entity) => entity.filePath),
    ['roles/admin.yaml'],
  );
});

test('ignores non-model files under known scopes', () => {
  const index = createPathDerivedEntityIndex([
    file('roles/README.md'),
    file('roles/admin.yaml.bak'),
    file('roles/.yaml'),
    file('roles/admin.yaml'),
  ]);

  assert.deepEqual(
    index.entities.map((entity) => entity.filePath),
    ['roles/admin.yaml'],
  );
});

test('normalizes paths and sorts by known scope order and identity', () => {
  const index = createPathDerivedEntityIndex([
    file('events\\order-created.yml'),
    file('semantic-areas/packet/protected_receive.yaml'),
    file('./workflows/zeta.yaml'),
    file('workflows/alpha.yaml'),
    file('roles/user.yaml'),
    file('capabilities/payment/refund.json'),
    file('capabilities/payment/authorize.yaml'),
  ]);

  assert.deepEqual(
    index.entities.map((entity) => `${entity.scope}:${entity.identity}`),
    [
      'workflows:alpha',
      'workflows:zeta',
      'roles:user',
      'capabilities:payment/authorize',
      'capabilities:payment/refund',
      'semantic-areas:packet/protected_receive',
      'events:order-created',
    ],
  );
  assert.equal(index.scopes[0].scope, 'workflows');
  assert.equal(index.scopes[1].scope, 'roles');
  assert.equal(index.scopes[2].scope, 'capabilities');
});

test('finds the selected entity by scope and identity', () => {
  const index = createPathDerivedEntityIndex([
    file('roles/admin.yaml'),
    file('capabilities/connection/send_initial.yaml'),
  ]);

  assert.equal(
    findSelectedEntity(index, { scope: 'capabilities', identity: 'connection/send_initial' })
      ?.filePath,
    'capabilities/connection/send_initial.yaml',
  );
  assert.equal(findSelectedEntity(index, { scope: 'roles', identity: 'missing' }), undefined);
  assert.equal(findSelectedEntity(index, undefined), undefined);
});

test('default-selects the first available entity in scope order', () => {
  const index = createPathDerivedEntityIndex([
    file('roles/admin.yaml'),
    file('workflows/main.yaml'),
  ]);

  assert.deepEqual(getDefaultEntitySelection(index), { scope: 'workflows', identity: 'main' });
});

test('returns an empty index and no default selection for an empty workspace', () => {
  const index = createPathDerivedEntityIndex([]);

  assert.equal(index.totalEntities, 0);
  assert.equal(index.entities.length, 0);
  assert.equal(index.scopes.length, 11);
  assert.deepEqual(
    index.scopes.map((scopeGroup) => scopeGroup.entities.length),
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  );
  assert.equal(getDefaultEntitySelection(index), undefined);
});

function file(path: string, content = 'content intentionally not parsed'): WorkspaceFileEntry {
  return { path, content };
}


test('indexes semantic-area files by path without parsing workflow references', () => {
  const content = 'name: Area\nworkflows:\n  - missing/workflow\n';
  const index = createPathDerivedEntityIndex([file('semantic-areas/packet/protected_receive.yaml', content)]);

  assert.deepEqual(index.entities, [
    {
      scope: 'semantic-areas',
      identity: 'packet/protected_receive',
      filePath: 'semantic-areas/packet/protected_receive.yaml',
      displayName: 'protected_receive',
      extension: '.yaml',
    },
  ]);
});
