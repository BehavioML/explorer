import assert from 'node:assert/strict';
import test from 'node:test';
import { gzipSync } from 'node:zlib';
import { zipSync } from 'fflate';
import { ApplicationError, detectWorkspaceRoot, normalizeWorkspacePath } from '../src/core';
import { extractArchiveBytes } from '../src/adapters/browser';

test('normalizes workspace paths to POSIX-style relative paths', () => {
  assert.equal(normalizeWorkspacePath('./roles\\admin.yaml'), 'roles/admin.yaml');
  assert.equal(
    normalizeWorkspacePath('/behavioml//workflows/main.yaml'),
    'behavioml/workflows/main.yaml',
  );
});

test('rejects path traversal while normalizing workspace paths', () => {
  assert.throws(
    () => normalizeWorkspacePath('roles/../outside.yaml'),
    (error) => error instanceof ApplicationError && error.kind === 'archive_extraction_failed',
  );
});

test('detects a BehavioML model root at archive root', () => {
  const result = detectWorkspaceRoot([
    { path: 'roles/user.yaml', content: 'id: user' },
    { path: 'workflows/main.yaml', content: 'id: main' },
  ]);

  assert.equal(result.rootPath, '');
  assert.deepEqual(
    result.files.map((file) => file.path),
    ['roles/user.yaml', 'workflows/main.yaml'],
  );
});

test('detects a BehavioML model root under behavioml', () => {
  const result = detectWorkspaceRoot([
    { path: 'README.md', content: 'ignored' },
    { path: 'behavioml/roles/user.yaml', content: 'id: user' },
  ]);

  assert.equal(result.rootPath, 'behavioml/');
  assert.deepEqual(
    result.files.map((file) => file.path),
    ['roles/user.yaml'],
  );
});

test('detects a conventional BehavioML model root under behavioml/model', () => {
  const result = detectWorkspaceRoot([
    { path: 'behavioml/README.md', content: 'ignored' },
    { path: 'behavioml/model/roles/user.yaml', content: 'id: user' },
  ]);

  assert.equal(result.rootPath, 'behavioml/model/');
  assert.deepEqual(
    result.files.map((file) => file.path),
    ['roles/user.yaml'],
  );
});

test('detects a non-wrapped feature-local BehavioML draft model root', () => {
  const result = detectWorkspaceRoot([
    {
      path: 'specs/001-model-explorer/behavioml-draft/model/capabilities/artifacts/show_generated_artifact.yaml',
      content: 'id: show_generated_artifact',
    },
    { path: 'specs/001-model-explorer/behavioml-draft/README.md', content: 'ignored' },
  ]);

  assert.equal(result.rootPath, 'specs/001-model-explorer/behavioml-draft/model/');
  assert.deepEqual(
    result.files.map((file) => file.path),
    ['capabilities/artifacts/show_generated_artifact.yaml'],
  );
});

test('detects a GitHub ZIP wrapper with a model root at the wrapper root', () => {
  const result = detectWorkspaceRoot([
    { path: 'explorer-main/README.md', content: 'ignored' },
    { path: 'explorer-main/roles/user.yaml', content: 'id: user' },
  ]);

  assert.equal(result.rootPath, 'explorer-main/');
  assert.deepEqual(
    result.files.map((file) => file.path),
    ['README.md', 'roles/user.yaml'],
  );
});

test('detects a GitHub ZIP wrapper with a model root under behavioml', () => {
  const result = detectWorkspaceRoot([
    { path: 'explorer-main/README.md', content: 'ignored' },
    { path: 'explorer-main/behavioml/roles/user.yaml', content: 'id: user' },
  ]);

  assert.equal(result.rootPath, 'explorer-main/behavioml/');
  assert.deepEqual(
    result.files.map((file) => file.path),
    ['roles/user.yaml'],
  );
});

test('detects a GitHub ZIP wrapper with a model root under behavioml/model', () => {
  const result = detectWorkspaceRoot([
    { path: 'explorer-main/README.md', content: 'ignored' },
    { path: 'explorer-main/behavioml/model/roles/user.yaml', content: 'id: user' },
  ]);

  assert.equal(result.rootPath, 'explorer-main/behavioml/model/');
  assert.deepEqual(
    result.files.map((file) => file.path),
    ['roles/user.yaml'],
  );
});

test('detects a GitHub ZIP wrapper with a feature-local BehavioML draft model root', () => {
  const result = detectWorkspaceRoot([
    { path: 'explorer-main/.github/workflows/ci.yml', content: 'name: CI' },
    {
      path: 'explorer-main/specs/001-model-explorer/behavioml-draft/model/capabilities/artifacts/show_generated_artifact.yaml',
      content: 'id: show_generated_artifact',
    },
  ]);

  assert.equal(result.rootPath, 'explorer-main/specs/001-model-explorer/behavioml-draft/model/');
  assert.deepEqual(
    result.files.map((file) => file.path),
    ['capabilities/artifacts/show_generated_artifact.yaml'],
  );
});

test('does not treat .github/workflows as a BehavioML model root', () => {
  assert.throws(
    () =>
      detectWorkspaceRoot([
        { path: '.github/workflows/ci.yml', content: 'name: CI' },
      ]),
    (error) => error instanceof ApplicationError && error.kind === 'workspace_root_not_found',
  );
});

test('reports ambiguous multiple populated feature-local BehavioML draft roots', () => {
  assert.throws(
    () =>
      detectWorkspaceRoot([
        {
          path: 'specs/001-alpha/behavioml-draft/model/roles/user.yaml',
          content: 'id: user',
        },
        {
          path: 'specs/002-beta/behavioml-draft/model/roles/admin.yaml',
          content: 'id: admin',
        },
      ]),
    (error) => error instanceof ApplicationError && error.kind === 'workspace_root_ambiguous',
  );
});

test('reports ambiguous root detection', () => {
  assert.throws(
    () =>
      detectWorkspaceRoot([
        { path: 'roles/root.yaml', content: 'id: root' },
        { path: 'behavioml/roles/nested.yaml', content: 'id: nested' },
      ]),
    (error) => error instanceof ApplicationError && error.kind === 'workspace_root_ambiguous',
  );
});

test('extracts a .tgz archive to files relative to the detected model root', async () => {
  const archiveBytes = createTarGz({
    'behavioml/roles/user.yaml': 'description: User role.\n',
    'behavioml/generated/reports/ignored.md': 'ignored',
  });

  const result = await extractArchiveBytes(archiveBytes, 'model.tgz');

  assert.equal(result.modelRoot, 'behavioml/');
  assert.deepEqual(result.files, [
    { path: 'roles/user.yaml', content: 'description: User role.\n' },
  ]);
});

test('extracts a .zip archive with model files at archive root', async () => {
  const archiveBytes = createZip({
    'roles/user.yaml': 'description: User role.\n',
    'workflows/main.json': '{"id":"main"}\n',
  });

  const result = await extractArchiveBytes(archiveBytes, 'model.zip');

  assert.equal(result.modelRoot, '');
  assert.deepEqual(result.files, [
    { path: 'roles/user.yaml', content: 'description: User role.\n' },
    { path: 'workflows/main.json', content: '{"id":"main"}\n' },
  ]);
});

const conventionalZipArchive = createZip({
  'behavioml/model/roles/user.yaml': 'description: User role.\n',
  'behavioml/model/components/service.yml': 'description: Service component.\n',
});

test('extracts a .zip archive with model files under behavioml/model', async () => {
  const result = await extractArchiveBytes(conventionalZipArchive, 'model.zip');

  assert.equal(result.modelRoot, 'behavioml/model/');
  assert.deepEqual(result.files, [
    { path: 'roles/user.yaml', content: 'description: User role.\n' },
    { path: 'components/service.yml', content: 'description: Service component.\n' },
  ]);
});

test('extracts a GitHub-style .zip archive with validation files relative to the feature draft root', async () => {
  const archiveBytes = createZip({
    'explorer-main/specs/001-model-explorer/behavioml-draft/model/capabilities/artifacts/show_generated_artifact.yaml':
      'id: show_generated_artifact\n',
    'explorer-main/.github/workflows/ci.yml': 'name: CI\n',
  });

  const result = await extractArchiveBytes(archiveBytes, 'explorer-main.zip');

  assert.equal(result.modelRoot, 'explorer-main/specs/001-model-explorer/behavioml-draft/model/');
  assert.deepEqual(result.files, [
    {
      path: 'capabilities/artifacts/show_generated_artifact.yaml',
      content: 'id: show_generated_artifact\n',
    },
  ]);
});

test('reports unsupported archive types clearly', async () => {
  await assert.rejects(
    () => extractArchiveBytes(new ArrayBuffer(0), 'model.tar'),
    (error) =>
      error instanceof ApplicationError &&
      error.kind === 'unsupported_archive_type' &&
      error.message.includes('Upload a `.tgz`, `.tar.gz`, or `.zip` archive.'),
  );
});

test('rejects path traversal inside a .zip archive', async () => {
  const archiveBytes = createZip({
    '../roles/user.yaml': 'description: User role.\n',
  });

  await assert.rejects(
    () => extractArchiveBytes(archiveBytes, 'model.zip'),
    (error) => error instanceof ApplicationError && error.kind === 'archive_extraction_failed',
  );
});

test('ignores non-model files inside a .zip archive', async () => {
  const archiveBytes = createZip({
    'roles/user.yaml': 'description: User role.\n',
    'roles/notes.md': 'ignored',
    'assets/logo.svg': '<svg />',
  });

  const result = await extractArchiveBytes(archiveBytes, 'model.zip');

  assert.deepEqual(result.files, [
    { path: 'roles/user.yaml', content: 'description: User role.\n' },
  ]);
});

test('reports invalid UTF-8 ZIP model entries as archive extraction errors', async () => {
  const archiveBytes = createZipBytes({
    'roles/user.yaml': new Uint8Array([0xff, 0xfe, 0xfd]),
  });

  await assert.rejects(
    () => extractArchiveBytes(archiveBytes, 'model.zip'),
    (error) =>
      error instanceof ApplicationError &&
      error.kind === 'archive_extraction_failed' &&
      error.message.includes('not valid UTF-8 text'),
  );
});

test('reports malformed .zip archives as archive extraction errors', async () => {
  await assert.rejects(
    () => extractArchiveBytes(new Uint8Array([1, 2, 3, 4]).buffer, 'model.zip'),
    (error) =>
      error instanceof ApplicationError &&
      error.kind === 'archive_extraction_failed' &&
      error.message.includes('model.zip'),
  );
});

function createTarGz(files: Record<string, string>): ArrayBuffer {
  const blocks: Buffer[] = [];

  for (const [path, content] of Object.entries(files)) {
    const contentBuffer = Buffer.from(content, 'utf8');
    const header = Buffer.alloc(512);
    header.write(path, 0, 100, 'utf8');
    header.write('000644\0', 100, 8, 'ascii');
    header.write('0000000\0', 108, 8, 'ascii');
    header.write('0000000\0', 116, 8, 'ascii');
    header.write(contentBuffer.length.toString(8).padStart(11, '0') + '\0', 124, 12, 'ascii');
    header.write('00000000000\0', 136, 12, 'ascii');
    header.fill(' ', 148, 156);
    header.write('0', 156, 1, 'ascii');
    header.write('ustar\0', 257, 6, 'ascii');
    header.write('00', 263, 2, 'ascii');

    const checksum = [...header].reduce((sum, byte) => sum + byte, 0);
    header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii');

    blocks.push(header, contentBuffer);

    const remainder = contentBuffer.length % 512;
    if (remainder > 0) {
      blocks.push(Buffer.alloc(512 - remainder));
    }
  }

  blocks.push(Buffer.alloc(1024));
  const gzipBuffer = gzipSync(Buffer.concat(blocks));
  return gzipBuffer.buffer.slice(
    gzipBuffer.byteOffset,
    gzipBuffer.byteOffset + gzipBuffer.byteLength,
  ) as ArrayBuffer;
}

function createZip(files: Record<string, string>): ArrayBuffer {
  return createZipBytes(
    Object.fromEntries(
      Object.entries(files).map(([path, content]) => [path, Buffer.from(content, 'utf8')]),
    ),
  );
}

function createZipBytes(files: Record<string, Uint8Array>): ArrayBuffer {
  const zipBuffer = zipSync(files);
  return zipBuffer.buffer.slice(
    zipBuffer.byteOffset,
    zipBuffer.byteOffset + zipBuffer.byteLength,
  ) as ArrayBuffer;
}
