import assert from 'node:assert/strict';
import test from 'node:test';
import { renderMermaidDiagram } from '../src/adapters/mermaid';

test('Mermaid render adapter initializes strict browser rendering and returns SVG', async () => {
  const initializedConfigs: unknown[] = [];
  const result = await renderMermaidDiagram('sequenceDiagram\n  participant Buyer\n', {
    diagramId: 'workflow:checkout/place_order',
    moduleLoader: async () => ({
      default: {
        initialize: (config) => {
          initializedConfigs.push(config);
        },
        render: (id, source) => {
          assert.equal(id, 'workflow-checkout-place_order');
          assert.match(source, /^sequenceDiagram/);
          return { svg: '<svg role="img"></svg>' };
        },
      },
    }),
  });

  assert.deepEqual(initializedConfigs, [
    { startOnLoad: false, securityLevel: 'strict', htmlLabels: false },
  ]);
  assert.deepEqual(result, { status: 'rendered', svg: '<svg role="img"></svg>' });
});

test('Mermaid render adapter maps renderer failures to render errors', async () => {
  const result = await renderMermaidDiagram('not mermaid', {
    moduleLoader: async () => ({
      default: {
        initialize: () => undefined,
        render: () => {
          throw new Error('parse failed');
        },
      },
    }),
  });

  assert.deepEqual(result, { status: 'render_error', message: 'parse failed' });
});
