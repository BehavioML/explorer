import assert from 'node:assert/strict';
import test from 'node:test';
import {
  generateDiagramArtifactForEntity,
  generateDiagramArtifactsForWorkspace,
  toGeneratedDiagramArtifactViewModel,
} from '../src/adapters/generator';
import type { PathDerivedModelEntity, WorkspaceFileEntry } from '../src/core';

const workflowEntity: PathDerivedModelEntity = {
  scope: 'workflows',
  identity: 'checkout/place_order',
  displayName: 'place_order',
  filePath: 'workflows/checkout/place_order.yaml',
  extension: '.yaml',
};

const capabilityEntity: PathDerivedModelEntity = {
  scope: 'capabilities',
  identity: 'checkout/charge_card',
  displayName: 'charge_card',
  filePath: 'capabilities/checkout/charge_card.yaml',
  extension: '.yaml',
};

const stateMachineEntity: PathDerivedModelEntity = {
  scope: 'state-machines',
  identity: 'checkout/order_state',
  displayName: 'order_state',
  filePath: 'state-machines/checkout/order_state.yaml',
  extension: '.yaml',
};

const semanticAreaEntity: PathDerivedModelEntity = {
  scope: 'semantic-areas',
  identity: 'packet/protected_receive',
  displayName: 'protected_receive',
  filePath: 'semantic-areas/packet/protected_receive.yaml',
  extension: '.yaml',
};

const files: readonly WorkspaceFileEntry[] = [
  { path: 'workflows/checkout/place_order.yaml', content: 'name: place order' },
];

test('adapter maps generator artifacts to Explorer diagram view models', () => {
  const artifact = toGeneratedDiagramArtifactViewModel({
    kind: 'workflow-sequence',
    format: 'mermaid',
    title: 'Workflow sequence: checkout/place_order',
    path: 'generated/workflows/checkout/place_order.mmd',
    content: 'sequenceDiagram\n  participant Buyer\n',
    sourceEntity: { kind: 'workflow', id: 'checkout/place_order' },
    diagnostics: [{ severity: 'warning', message: 'example warning' }],
    sourceMap: [
      {
        diagramId: 'workflow-checkout-place-order',
        role: 'entity',
        entity: { scope: 'workflows', identity: 'checkout/place_order' },
        label: 'Place order',
      },
    ],
  });

  assert.deepEqual(artifact, {
    kind: 'workflow-sequence',
    format: 'mermaid',
    title: 'Workflow sequence: checkout/place_order',
    path: 'generated/workflows/checkout/place_order.mmd',
    content: 'sequenceDiagram\n  participant Buyer\n',
    sourceEntity: { kind: 'workflow', id: 'checkout/place_order' },
    diagnostics: [{ severity: 'warning', message: 'example warning' }],
    sourceMap: [
      {
        diagramId: 'workflow-checkout-place-order',
        role: 'entity',
        entity: { scope: 'workflows', identity: 'checkout/place_order' },
        label: 'Place order',
      },
    ],
  });
});

test('workflow entity requests a single workflow sequence artifact using the selected identity', async () => {
  const requestedOptions: unknown[] = [];
  const diagram = await generateDiagramArtifactForEntity(files, workflowEntity, {
    moduleLoader: async () => ({
      generateWorkspaceArtifacts: (_files, options) => {
        requestedOptions.push(options);
        return [
          {
            kind: 'workflow-sequence',
            format: 'mermaid',
            title: 'Workflow sequence: checkout/place_order',
            path: 'generated/workflows/checkout/place_order.mmd',
            content: 'sequenceDiagram\n  participant Buyer\n',
            sourceEntity: { kind: 'workflow', id: 'checkout/place_order' },
            sourceMap: [
              {
                diagramId: 'workflow-checkout-place-order',
                role: 'entity',
                entity: { scope: 'workflows', identity: 'checkout/place_order' },
                label: 'Place order',
              },
            ],
          },
        ];
      },
    }),
  });

  assert.deepEqual(requestedOptions, [
    {
      artifacts: ['workflow-sequence:checkout/place_order'],
      formats: ['mermaid'],
      workflow: 'checkout/place_order',
    },
  ]);
  assert.equal(diagram.status, 'generated');
  assert.equal(diagram.artifact?.content.startsWith('sequenceDiagram'), true);
  assert.deepEqual(diagram.artifact?.sourceMap, [
    {
      diagramId: 'workflow-checkout-place-order',
      role: 'entity',
      entity: { scope: 'workflows', identity: 'checkout/place_order' },
      label: 'Place order',
    },
  ]);
});

test('unsupported entity type returns an unsupported diagram status without calling generator', async () => {
  let generatorWasCalled = false;
  const diagram = await generateDiagramArtifactForEntity(files, capabilityEntity, {
    moduleLoader: async () => ({
      generateWorkspaceArtifacts: () => {
        generatorWasCalled = true;
        return [];
      },
    }),
  });

  assert.equal(generatorWasCalled, false);
  assert.equal(diagram.status, 'unsupported_entity');
});

test('generator diagnostics are surfaced for selected workflow diagrams', async () => {
  const diagram = await generateDiagramArtifactForEntity(files, workflowEntity, {
    moduleLoader: async () => ({
      generateWorkspaceArtifacts: () => [
        {
          kind: 'workflow-sequence',
          format: 'mermaid',
          title: 'Workflow sequence: checkout/place_order',
          path: 'generated/workflows/checkout/place_order.mmd',
          content: '',
          sourceEntity: { kind: 'workflow', id: 'checkout/place_order' },
          diagnostics: [{ severity: 'error', message: 'workflow-sequence view requires steps' }],
        },
      ],
    }),
  });

  assert.equal(diagram.status, 'generator_diagnostics');
  assert.deepEqual(diagram.diagnostics, [
    { severity: 'error', message: 'workflow-sequence view requires steps' },
  ]);
});

test('state-machine entity reports generator limitation when per-entity artifacts are unavailable', async () => {
  const diagram = await generateDiagramArtifactForEntity(files, stateMachineEntity, {
    moduleLoader: async () => ({
      generateWorkspaceArtifacts: (_files, options) => {
        assert.deepEqual(options, { artifacts: ['state-machines'], formats: ['mermaid'] });
        return [
          {
            kind: 'state-machines',
            format: 'mermaid',
            title: 'state-machines',
            path: 'generated/state-machines.mmd',
            content: 'stateDiagram-v2\n',
          },
        ];
      },
    }),
  });

  assert.equal(diagram.status, 'unsupported_artifact');
  assert.match(diagram.message, /does not yet expose a per-state-machine artifact/);
});


test('semantic-area entity reports generator artifact limitation without calling generator', async () => {
  let generatorWasCalled = false;
  const diagram = await generateDiagramArtifactForEntity(files, semanticAreaEntity, {
    moduleLoader: async () => ({
      generateWorkspaceArtifacts: () => {
        generatorWasCalled = true;
        return [
          {
            kind: 'semantic-area-workflows',
            format: 'mermaid',
            title: 'Semantic area workflows: packet/protected_receive',
            path: 'generated/semantic-areas/packet/protected_receive.mmd',
            content: 'flowchart TD\n',
            sourceEntity: { kind: 'semantic-area', id: 'packet/protected_receive' },
          },
        ];
      },
    }),
  });

  assert.equal(generatorWasCalled, false);
  assert.equal(diagram.status, 'unsupported_artifact');
  assert.match(diagram.message, /semantic-area workflow artifact/i);
  assert.match(diagram.message, /does not generate semantic-area Mermaid locally/);
});


test('generator failures become adapter-error diagram states for selected workflows', async () => {
  const diagram = await generateDiagramArtifactForEntity(files, workflowEntity, {
    moduleLoader: async () => ({
      generateWorkspaceArtifacts: () => {
        throw new Error('generator failed');
      },
    }),
  });

  assert.equal(diagram.status, 'adapter_error');
  assert.match(diagram.message, /Generator is not available/);
});

test('malformed generator artifact collections are adapter errors', async () => {
  const result = await generateDiagramArtifactsForWorkspace(files, {
    moduleLoader: async () => ({
      generateWorkspaceArtifacts: () => ({ malformed: true }) as unknown as readonly unknown[],
    }),
  });

  assert.equal(result.status, 'adapter_error');
});

test('generator adapter renders aggregated workflow references in collapsed mode through canonical Generator', async () => {
  const result = await generateDiagramArtifactsForWorkspace(aggregatedWorkflowFiles, {
    artifacts: ['workflow-sequence:aggregate/checkout'],
    formats: ['mermaid'],
    workflow: 'aggregate/checkout',
  });

  assert.equal(result.status, 'generated');
  if (result.status !== 'generated') {
    return;
  }

  assert.equal(result.artifacts.length, 1);
  assert.deepEqual(result.artifacts[0]?.diagnostics ?? [], []);
  assert.match(result.artifacts[0]?.content ?? '', /participant shopper as Shopper/);
  assert.match(result.artifacts[0]?.content ?? '', /participant payment_gateway as Payment Gateway/);
  assert.match(
    result.artifacts[0]?.content ?? '',
    /Note over shopper,payment_gateway: Child workflow: workflows\/checkout\/collect_payment/,
  );
  assert.doesNotMatch(result.artifacts[0]?.content ?? '', /Submit payment/);
});

test('generator adapter can request expanded aggregated workflow rendering with role binding', async () => {
  const result = await generateDiagramArtifactsForWorkspace(aggregatedWorkflowFiles, {
    artifacts: ['workflow-sequence:aggregate/checkout'],
    formats: ['mermaid'],
    workflow: 'aggregate/checkout',
    workflowComposition: 'expanded',
  });

  assert.equal(result.status, 'generated');
  if (result.status !== 'generated') {
    return;
  }

  assert.equal(result.artifacts.length, 1);
  assert.deepEqual(result.artifacts[0]?.diagnostics ?? [], []);
  assert.match(result.artifacts[0]?.content ?? '', /shopper->>payment_gateway: Submit payment/);
  assert.doesNotMatch(result.artifacts[0]?.content ?? '', /buyer->>processor/);
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
