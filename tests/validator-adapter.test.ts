import assert from 'node:assert/strict';
import test from 'node:test';
import { validateInMemoryModelWorkspace } from '../src/adapters/validator';
import type { WorkspaceFileEntry } from '../src/core';

test('validator adapter exposes semantic-area summaries and accepts semantic-area typed refs through canonical Validator', async () => {
  const files: readonly WorkspaceFileEntry[] = [
    {
      path: 'workflows/packet/receive.yaml',
      content: 'name: Receive packet\nroles:\n  primary: packet/client\nsteps: []\n',
    },
    { path: 'roles/packet/client.yaml', content: 'name: Packet client\n' },
    {
      path: 'semantic-areas/packet/protected_receive.yaml',
      content:
        'name: Protected receive\ndescription: Packet receive behavior\nworkflows:\n  - packet/receive\n',
    },
    {
      path: 'decisions/defer_flow_control_lifecycle_until_events_are_clear.yaml',
      content:
        'summary: Defer lifecycle\naffects:\n  - semantic-areas:packet/protected_receive\n',
    },
  ];

  const result = await validateInMemoryModelWorkspace(files);

  assert.equal(result.status, 'validated');
  if (result.status !== 'validated') {
    return;
  }

  assert.equal(
    result.validation.diagnostics.some((diagnostic) =>
      diagnostic.message.includes('invalid typed reference scope "semantic-areas"'),
    ),
    false,
  );
  assert.deepEqual(result.validation.entitySummaries, [
    {
      scope: 'semantic-areas',
      identity: 'packet/protected_receive',
      filePath: 'semantic-areas/packet/protected_receive.yaml',
      displayName: 'Protected receive',
      description: 'Packet receive behavior',
      workflowReferences: ['packet/receive'],
    },
  ]);
  assert.equal(
    result.validation.referenceIndex?.outgoingReferences.some(
      (reference) =>
        reference.source.scope === 'semantic-areas' &&
        reference.source.identity === 'packet/protected_receive' &&
        reference.fieldPath === 'workflows[0]' &&
        reference.targetScope === 'workflows' &&
        reference.targetIdentity === 'packet/receive' &&
        reference.resolved,
    ),
    true,
  );
});
