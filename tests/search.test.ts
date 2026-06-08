import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPathDerivedEntityIndex,
  searchWorkspace,
  type WorkspaceFileEntry,
} from '../src/core';

test('empty query returns no results', () => {
  const workspace = workspaceFixture();

  assert.deepEqual(searchWorkspace({ ...workspace, query: '   ' }), []);
});

test('finds entity identity matches', () => {
  const workspace = workspaceFixture();
  const results = searchWorkspace({ ...workspace, query: 'customer/onboarding' });

  assert.deepEqual(results.map((result) => result.kind), ['entity']);
  assert.deepEqual(results[0].entityKey, { scope: 'workflows', identity: 'customer/onboarding' });
  assert.equal(results[0].matchText, 'customer/onboarding');
});

test('finds entity scope matches', () => {
  const workspace = workspaceFixture();
  const results = searchWorkspace({ ...workspace, query: 'roles' });

  assert.deepEqual(
    results.filter((result) => result.kind === 'entity').map((result) => result.entityKey),
    [{ scope: 'roles', identity: 'admin' }],
  );
});

test('finds entity file path matches', () => {
  const workspace = workspaceFixture();
  const results = searchWorkspace({ ...workspace, query: 'capabilities/email' });

  assert.deepEqual(results[0], {
    kind: 'entity',
    entityKey: { scope: 'capabilities', identity: 'email/send' },
    scope: 'capabilities',
    identity: 'email/send',
    filePath: 'capabilities/email/send.yaml',
    label: 'send',
    matchText: 'capabilities/email/send.yaml',
  });
});

test('finds source content matches with line numbers and line text', () => {
  const workspace = workspaceFixture();
  const results = searchWorkspace({ ...workspace, query: 'send confirmation email' });

  assert.deepEqual(results, [
    {
      kind: 'source_match',
      entityKey: { scope: 'capabilities', identity: 'email/send' },
      scope: 'capabilities',
      identity: 'email/send',
      filePath: 'capabilities/email/send.yaml',
      label: 'send',
      matchText: 'description: Send confirmation email',
      lineNumber: 2,
      lineText: 'description: Send confirmation email',
    },
  ]);
});

test('matches case-insensitively', () => {
  const workspace = workspaceFixture();
  const results = searchWorkspace({ ...workspace, query: 'ADMIN' });

  assert.deepEqual(results[0].entityKey, { scope: 'roles', identity: 'admin' });
});

test('limits results', () => {
  const files = Array.from({ length: 120 }, (_, index) =>
    file(`roles/entity-${index.toString().padStart(3, '0')}.yaml`, 'name: repeated'),
  );
  const entityIndex = createPathDerivedEntityIndex(files);
  const results = searchWorkspace({ files, entityIndex, query: { text: 'repeated', maxResults: 25 } });

  assert.equal(results.length, 25);
  assert.ok(results.every((result) => result.kind === 'source_match'));
});

test('collapses duplicate entity metadata matches', () => {
  const files = [file('roles/roles.yaml', 'name: roles')];
  const entityIndex = createPathDerivedEntityIndex(files);
  const results = searchWorkspace({ files, entityIndex, query: 'roles' });

  assert.deepEqual(
    results.filter((result) => result.kind === 'entity').map((result) => result.entityKey),
    [{ scope: 'roles', identity: 'roles' }],
  );
});

test('handles source matches with no corresponding path-derived entity', () => {
  const files = [file('README.md', 'workspace TODO marker')];
  const entityIndex = createPathDerivedEntityIndex(files);
  const results = searchWorkspace({ files, entityIndex, query: 'todo' });

  assert.deepEqual(results, [
    {
      kind: 'source_match',
      filePath: 'README.md',
      label: 'README.md',
      matchText: 'workspace TODO marker',
      lineNumber: 1,
      lineText: 'workspace TODO marker',
    },
  ]);
});


test('finds semantic areas by path and raw workflow reference text', () => {
  const files = [
    file(
      'semantic-areas/packet/protected_receive.yaml',
      'name: Protected receive\ndescription: Packet receive behavior\nworkflows:\n  - packet/receive',
    ),
  ];
  const entityIndex = createPathDerivedEntityIndex(files);

  assert.deepEqual(searchWorkspace({ files, entityIndex, query: 'protected_receive' })[0].entityKey, {
    scope: 'semantic-areas',
    identity: 'packet/protected_receive',
  });
  assert.deepEqual(searchWorkspace({ files, entityIndex, query: 'packet/receive' })[0], {
    kind: 'source_match',
    entityKey: { scope: 'semantic-areas', identity: 'packet/protected_receive' },
    scope: 'semantic-areas',
    identity: 'packet/protected_receive',
    filePath: 'semantic-areas/packet/protected_receive.yaml',
    label: 'protected_receive',
    matchText: '  - packet/receive',
    lineNumber: 4,
    lineText: '  - packet/receive',
  });
});

function workspaceFixture(): {
  readonly files: readonly WorkspaceFileEntry[];
  readonly entityIndex: ReturnType<typeof createPathDerivedEntityIndex>;
} {
  const files = [
    file('workflows/customer/onboarding.yaml', 'name: onboarding\nstep: start'),
    file('roles/admin.yaml', 'name: Admin\npermissions: all'),
    file('capabilities/email/send.yaml', 'name: send\ndescription: Send confirmation email'),
  ];

  return { files, entityIndex: createPathDerivedEntityIndex(files) };
}

function file(path: string, content: string): WorkspaceFileEntry {
  return { path, content };
}
