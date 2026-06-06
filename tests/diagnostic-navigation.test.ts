import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDiagnosticNavigationTarget,
  createPathDerivedEntityIndex,
  findDiagnosticsForEntity,
  findEntityForDiagnostic,
  type DiagnosticViewModel,
  type WorkspaceFileEntry,
} from '../src/core';

test('matches a diagnostic file path to an entity by exact normalized path', () => {
  const index = createPathDerivedEntityIndex([file('roles/admin.yaml')]);
  const diagnostic = diagnosticFor('roles/admin.yaml');

  assert.deepEqual(findEntityForDiagnostic(index, diagnostic), {
    scope: 'roles',
    identity: 'admin',
  });
  assert.deepEqual(createDiagnosticNavigationTarget(index, diagnostic), {
    diagnostic,
    status: 'matched_entity',
    entityKey: { scope: 'roles', identity: 'admin' },
  });
});

test('matches Windows-style diagnostic paths after workspace path normalization', () => {
  const index = createPathDerivedEntityIndex([file('capabilities/payment/authorize.yaml')]);

  assert.deepEqual(
    findEntityForDiagnostic(index, diagnosticFor('capabilities\\payment\\authorize.yaml')),
    {
      scope: 'capabilities',
      identity: 'payment/authorize',
    },
  );
});

test('keeps diagnostics without file paths selectable only as missing-file targets', () => {
  const index = createPathDerivedEntityIndex([file('roles/admin.yaml')]);
  const diagnostic: DiagnosticViewModel = {
    severity: 'error',
    message: 'workspace-level diagnostic',
  };

  assert.equal(findEntityForDiagnostic(index, diagnostic), undefined);
  assert.deepEqual(createDiagnosticNavigationTarget(index, diagnostic), {
    diagnostic,
    status: 'missing_file_path',
  });
});

test('keeps unmatched diagnostic files without inventing an entity match', () => {
  const index = createPathDerivedEntityIndex([file('roles/admin.yaml')]);
  const diagnostic = diagnosticFor('supporting/context.yaml');

  assert.equal(findEntityForDiagnostic(index, diagnostic), undefined);
  assert.deepEqual(createDiagnosticNavigationTarget(index, diagnostic), {
    diagnostic,
    status: 'unmatched_file_path',
  });
});

test('finds diagnostics for the selected entity by normalized exact file path only', () => {
  const index = createPathDerivedEntityIndex([
    file('roles/admin.yaml'),
    file('roles/user.yaml'),
  ]);
  const [admin] = index.entities;
  const diagnostics = [
    diagnosticFor('roles\\admin.yaml', 'admin problem'),
    diagnosticFor('roles/user.yaml', 'user problem'),
    diagnosticFor('roles/admin.yaml.extra', 'not exact'),
    { severity: 'info', message: 'workspace diagnostic' },
  ];

  assert.deepEqual(
    findDiagnosticsForEntity(diagnostics, admin).map((diagnostic) => diagnostic.message),
    ['admin problem'],
  );
});

test('preserves Validator field paths as opaque diagnostic display text', () => {
  const index = createPathDerivedEntityIndex([file('events/order-created.yaml')]);
  const diagnostic = diagnosticFor(
    'events/order-created.yaml',
    'opaque field path problem',
    'foo.bar[0]',
  );
  const target = createDiagnosticNavigationTarget(index, diagnostic);

  assert.equal(target.diagnostic, diagnostic);
  assert.equal(target.diagnostic.fieldPath, 'foo.bar[0]');
});


test('matches semantic-area Validator diagnostics to path-derived semantic-area entities', () => {
  const index = createPathDerivedEntityIndex([
    file('semantic-areas/packet/protected_receive.yaml'),
  ]);
  const diagnostic = diagnosticFor(
    'semantic-areas/packet/protected_receive.yaml',
    'workflow reference is invalid',
    'workflows[0]',
  );

  assert.deepEqual(findEntityForDiagnostic(index, diagnostic), {
    scope: 'semantic-areas',
    identity: 'packet/protected_receive',
  });
  assert.deepEqual(createDiagnosticNavigationTarget(index, diagnostic), {
    diagnostic,
    status: 'matched_entity',
    entityKey: { scope: 'semantic-areas', identity: 'packet/protected_receive' },
  });
});

test('finds selected semantic-area diagnostics by exact normalized file path only', () => {
  const index = createPathDerivedEntityIndex([
    file('semantic-areas/packet/protected_receive.yaml'),
    file('semantic-areas/packet/other.yaml'),
  ]);
  const selected = index.entities.find(
    (entity) => entity.scope === 'semantic-areas' && entity.identity === 'packet/protected_receive',
  );
  assert.ok(selected);

  const diagnostics = [
    diagnosticFor('semantic-areas\\packet\\protected_receive.yaml', 'workflow ref problem', 'workflows[0]'),
    diagnosticFor('semantic-areas/packet/other.yaml', 'other area problem', 'workflows[0]'),
    diagnosticFor('semantic-areas/packet/protected_receive.yaml.extra', 'not exact', 'workflows[0]'),
  ];

  assert.deepEqual(
    findDiagnosticsForEntity(diagnostics, selected).map((diagnostic) => ({
      message: diagnostic.message,
      fieldPath: diagnostic.fieldPath,
    })),
    [{ message: 'workflow ref problem', fieldPath: 'workflows[0]' }],
  );
});

function file(path: string): WorkspaceFileEntry {
  return { path, content: 'content intentionally not parsed' };
}

function diagnosticFor(
  filePath: string,
  message = 'diagnostic message',
  fieldPath?: string,
): DiagnosticViewModel {
  return {
    severity: 'error',
    message,
    filePath,
    fieldPath,
  };
}
