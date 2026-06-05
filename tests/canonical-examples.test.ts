import assert from 'node:assert/strict';
import test from 'node:test';
import { ApplicationError, type WorkspaceFileEntry } from '../src/core';
import {
  createCanonicalExampleWorkspace,
  selectCanonicalExampleModelSubtree,
} from '../src/adapters/browser';

const githubZipShapedFiles: readonly WorkspaceFileEntry[] = [
  {
    path: 'specifications-main/examples/quic/model/workflows/handshake.yaml',
    content: 'id: handshake',
  },
  {
    path: 'specifications-main/examples/quic/model/roles/client.yaml',
    content: 'id: client',
  },
  {
    path: 'specifications-main/examples/quic/docs/notes.yaml',
    content: 'id: outside-quic-model',
  },
  {
    path: 'specifications-main/examples/oauth-authorization-code/model/workflows/authorization_code.yaml',
    content: 'id: authorization_code',
  },
  {
    path: 'specifications-main/examples/whip/model/workflows/publish.yaml',
    content: 'id: publish',
  },
];

test('selects the requested example model subtree from a GitHub ZIP-shaped file list', () => {
  const selectedFiles = selectCanonicalExampleModelSubtree(githubZipShapedFiles, 'quic');

  assert.deepEqual(
    selectedFiles.map((file) => file.path),
    ['workflows/handshake.yaml', 'roles/client.yaml'],
  );
});

test('rejects unknown canonical examples', () => {
  assert.throws(
    () => selectCanonicalExampleModelSubtree(githubZipShapedFiles, 'unknown-example'),
    (error) => error instanceof ApplicationError && error.kind === 'adapter_error',
  );
});

test('rejects missing example paths', () => {
  assert.throws(
    () =>
      selectCanonicalExampleModelSubtree(
        [
          {
            path: 'specifications-main/examples/oauth-authorization-code/model/workflows/authorization_code.yaml',
            content: 'id: authorization_code',
          },
        ],
        'quic',
      ),
    (error) => error instanceof ApplicationError && error.kind === 'workspace_root_not_found',
  );
});

test('preserves model paths relative to the selected example model root', () => {
  const workspace = createCanonicalExampleWorkspace(githubZipShapedFiles, 'oauth-authorization-code');

  assert.equal(workspace.sourceLabel, 'BehavioML/specifications/examples/oauth-authorization-code');
  assert.equal(workspace.modelRoot, '');
  assert.deepEqual(
    workspace.files.map((file) => file.path),
    ['workflows/authorization_code.yaml'],
  );
});

test('does not include files outside the selected example model root', () => {
  const selectedFiles = selectCanonicalExampleModelSubtree(githubZipShapedFiles, 'whip');

  assert.deepEqual(
    selectedFiles.map((file) => file.path),
    ['workflows/publish.yaml'],
  );
  assert.ok(selectedFiles.every((file) => !file.path.includes('oauth-authorization-code')));
  assert.ok(selectedFiles.every((file) => !file.path.includes('docs/notes')));
});

test('rejects an example subtree with no known BehavioML model files', () => {
  assert.throws(
    () =>
      createCanonicalExampleWorkspace(
        [
          {
            path: 'specifications-main/examples/quic/model/metadata/readme.yaml',
            content: 'id: metadata',
          },
        ],
        'quic',
      ),
    (error) => error instanceof ApplicationError && error.kind === 'workspace_root_not_found',
  );
});
