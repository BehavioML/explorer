import assert from 'node:assert/strict';
import test from 'node:test';
import {
  countWorkspaceScopes,
  createValidatedWorkspaceOverview,
  createWorkspaceOverview,
  summarizeDiagnostics,
} from '../src/core';
import type { WorkspaceFileEntry } from '../src/core';

test('counts root-level BehavioML scope files', () => {
  const counts = countWorkspaceScopes([
    file('workflows/order.yaml'),
    file('roles/customer.yaml'),
    file('capabilities/pay.yaml'),
  ]);

  assert.equal(counts.workflows, 1);
  assert.equal(counts.roles, 1);
  assert.equal(counts.capabilities, 1);
  assert.equal(counts.interfaces, 0);
});

test('counts nested files under known scope directories', () => {
  const counts = countWorkspaceScopes([
    file('workflows/commerce/order.yaml'),
    file('state-machines/order/lifecycle.yml'),
    file('decisions/fraud/review.json'),
    file('semantic-areas/packet/protected_receive.yaml'),
  ]);

  assert.equal(counts.workflows, 1);
  assert.equal(counts['state-machines'], 1);
  assert.equal(counts.decisions, 1);
  assert.equal(counts['semantic-areas'], 1);
});

test('ignores files outside known scope directories', () => {
  const counts = countWorkspaceScopes([
    file('generated/reports/workflows.json'),
    file('supporting/specs/roles.yaml'),
    file('notes.yaml'),
    file('roles/admin.yaml'),
  ]);

  assert.equal(counts.roles, 1);
  assert.equal(Object.values(counts).reduce((total, count) => total + count, 0), 1);
});

test('counts mixed YAML, YML, and JSON validation files by path scope', () => {
  const counts = countWorkspaceScopes([
    file('entities/customer.yaml'),
    file('events/order-created.yml'),
    file('modules/billing.json'),
    file('components/payment.yaml'),
    file('interfaces/processor.yml'),
  ]);

  assert.equal(counts.entities, 1);
  assert.equal(counts.events, 1);
  assert.equal(counts.modules, 1);
  assert.equal(counts.components, 1);
  assert.equal(counts.interfaces, 1);
});

test('returns zero counts for an empty workspace', () => {
  const counts = countWorkspaceScopes([]);

  assert.deepEqual(counts, {
    workflows: 0,
    roles: 0,
    capabilities: 0,
    interfaces: 0,
    components: 0,
    modules: 0,
    'semantic-areas': 0,
    events: 0,
    entities: 0,
    'state-machines': 0,
    decisions: 0,
  });
});

test('creates a workspace overview without parsing file content', () => {
  const overview = createWorkspaceOverview({
    sourceLabel: 'model.tgz',
    modelRoot: 'behavioml/model/',
    files: [file('roles/admin.yaml'), file('workflows/main.yaml')],
    validationStatus: 'running',
  });

  assert.equal(overview.sourceLabel, 'model.tgz');
  assert.equal(overview.modelRoot, 'behavioml/model/');
  assert.equal(overview.validationFileCount, 2);
  assert.equal(overview.scopeCounts.roles, 1);
  assert.equal(overview.scopeCounts.workflows, 1);
  assert.equal(overview.validationStatus, 'running');
  assert.deepEqual(overview.diagnosticSummary, { errors: 0, warnings: 0, other: 0 });
});

test('normalizes diagnostic severity names conservatively', () => {
  assert.deepEqual(
    summarizeDiagnostics([
      { severity: 'error', message: 'bad' },
      { severity: 'warning', message: 'warn' },
      { severity: 'warn', message: 'warn alias' },
      { severity: 'info', message: 'note' },
      { severity: 'notice', message: 'other' },
    ]),
    { errors: 1, warnings: 2, other: 2 },
  );
});

test('marks validated overview status from Validator diagnostics', () => {
  const validOverview = createValidatedWorkspaceOverview({
    sourceLabel: 'valid.tgz',
    files: [file('roles/admin.yaml')],
    validation: { ok: true, diagnostics: [] },
  });

  const diagnosticOverview = createValidatedWorkspaceOverview({
    sourceLabel: 'diagnostics.tgz',
    files: [file('roles/admin.yaml')],
    validation: {
      ok: false,
      diagnostics: [{ severity: 'error', message: 'bad', filePath: 'roles/admin.yaml' }],
    },
  });

  assert.equal(validOverview.validationStatus, 'valid');
  assert.equal(diagnosticOverview.validationStatus, 'has_diagnostics');
  assert.deepEqual(diagnosticOverview.diagnosticSummary, { errors: 1, warnings: 0, other: 0 });
});

function file(path: string): WorkspaceFileEntry {
  return { path, content: 'not parsed: true' };
}
