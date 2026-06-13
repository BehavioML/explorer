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

test('validator adapter accepts aggregated workflow reference steps through canonical Validator', async () => {
  const result = await validateInMemoryModelWorkspace(aggregatedWorkflowFiles);

  assert.equal(result.status, 'validated');
  if (result.status !== 'validated') {
    return;
  }

  assert.equal(result.validation.ok, true);
  assert.deepEqual(result.validation.diagnostics, []);
  assert.equal(
    result.validation.referenceIndex?.outgoingReferences.some(
      (reference) =>
        reference.source.scope === 'workflows' &&
        reference.source.identity === 'aggregate/checkout' &&
        reference.fieldPath === 'steps[0].workflow' &&
        reference.targetScope === 'workflows' &&
        reference.targetIdentity === 'checkout/collect_payment' &&
        reference.resolved,
    ),
    true,
  );
});

const aggregatedWorkflowFiles: readonly WorkspaceFileEntry[] = [
  {
    path: 'workflows/aggregate/checkout.yaml',
    content: [
      'name: Aggregate checkout',
      'roles:',
      '  primary: shopper',
      '  participants:',
      '    - payment_gateway',
      'steps:',
      '  - workflow: workflows/checkout/collect_payment',
      '    bind:',
      '      buyer: shopper',
      '      processor: payment_gateway',
      '',
    ].join('\n'),
  },
  {
    path: 'workflows/checkout/collect_payment.yaml',
    content: [
      'name: Collect payment',
      'roles:',
      '  primary: buyer',
      '  participants:',
      '    - processor',
      'steps:',
      '  - from: buyer',
      '    to: processor',
      '    capability: checkout/submit_payment',
      '    label: Submit payment',
      '',
    ].join('\n'),
  },
  { path: 'roles/shopper.yaml', content: 'description: Checkout shopper.\n' },
  { path: 'roles/payment_gateway.yaml', content: 'description: Payment gateway.\n' },
  { path: 'roles/buyer.yaml', content: 'description: Generic buyer.\n' },
  { path: 'roles/processor.yaml', content: 'description: Generic payment processor.\n' },
  { path: 'capabilities/checkout/submit_payment.yaml', content: 'description: Submit payment.\n' },
];
