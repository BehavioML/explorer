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

test('malformed generator artifact collections are adapter errors', async () => {
  const result = await generateDiagramArtifactsForWorkspace(files, {
    moduleLoader: async () => ({
      generateWorkspaceArtifacts: () => ({ malformed: true }) as unknown as readonly unknown[],
    }),
  });

  assert.equal(result.status, 'adapter_error');
});
