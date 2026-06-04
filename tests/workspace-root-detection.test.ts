import assert from 'node:assert/strict';
import test from 'node:test';
import { gzipSync } from 'node:zlib';
import { ApplicationError, detectWorkspaceRoot, normalizeWorkspacePath } from '../src/core';
import { extractArchiveBytes } from '../src/adapters/browser';

test('normalizes workspace paths to POSIX-style relative paths', () => {
  assert.equal(normalizeWorkspacePath('./roles\\admin.yaml'), 'roles/admin.yaml');
  assert.equal(normalizeWorkspacePath('/behavioml//workflows/main.yaml'), 'behavioml/workflows/main.yaml');
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

test('reports unsupported archive types clearly', async () => {
  await assert.rejects(
    () => extractArchiveBytes(new ArrayBuffer(0), 'model.zip'),
    (error) => error instanceof ApplicationError && error.kind === 'unsupported_archive_type',
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
