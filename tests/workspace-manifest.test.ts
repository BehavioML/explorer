import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveWorkspaceManifest, type WorkspaceFileEntry } from '../src/core';
import { extractArchiveBytes } from '../src/adapters/browser';
import { zipSync } from 'fflate';

test('prefers docs/behavioml/behavio.yaml aggregate entrypoint and resolves included model root', () => {
  const manifest = resolveWorkspaceManifest([
    file('other/behavio.yaml', 'id: other\ndescription: Other.\npaths:\n  model: model\n'),
    file('docs/behavioml/behavio.yaml', 'id: quiver\ndescription: Quiver behavior workspace.\ninclude:\n  quic: quic/behavio.yaml\n'),
    file('docs/behavioml/quic/behavio.yaml', 'id: quic\ndescription: QUIC behavior model for Quiver.\npaths:\n  specs: specs\n  model: model\n'),
    file('docs/behavioml/quic/model/roles/user.yaml', 'id: user\n'),
  ]);

  assert.equal(manifest?.entrypointPath, 'docs/behavioml/behavio.yaml');
  assert.equal(manifest?.id, 'quiver');
  assert.deepEqual(manifest?.models.map((model) => model.id), ['quic']);
  assert.equal(manifest?.models[0]?.modelRoot, 'docs/behavioml/quic/model/');
  assert.deepEqual(manifest?.diagnostics, []);
});

test('resolves a root model manifest with relative paths.model', () => {
  const manifest = resolveWorkspaceManifest([
    file('behavio.yaml', 'id: demo\ndescription: Demo model.\npaths:\n  model: model\n'),
    file('model/workflows/start.yaml', 'id: start\n'),
  ]);

  assert.equal(manifest?.models[0]?.id, 'demo');
  assert.equal(manifest?.models[0]?.modelRoot, 'model/');
});

test('returns undefined when no manifest exists so callers can use root autodetection fallback', () => {
  assert.equal(resolveWorkspaceManifest([file('model/roles/user.yaml', 'id: user\n')]), undefined);
});

test('reports malformed and invalid manifest shape diagnostics', () => {
  const manifest = resolveWorkspaceManifest([
    file('behavio.yaml', 'id demo\n'),
  ]);

  assert.match(manifest?.diagnostics[0]?.message ?? '', /cannot be parsed/);
});

test('reports missing included manifest diagnostics', () => {
  const manifest = resolveWorkspaceManifest([
    file('behavio.yaml', 'id: root\ndescription: Root.\ninclude:\n  quic: quic/behavio.yaml\n'),
  ]);

  assert.match(manifest?.diagnostics[0]?.message ?? '', /cannot be resolved/);
});

test('reports duplicate manifest ids diagnostics', () => {
  const manifest = resolveWorkspaceManifest([
    file('behavio.yaml', 'id: root\ndescription: Root.\ninclude:\n  a: a/behavio.yaml\n  b: b/behavio.yaml\n'),
    file('a/behavio.yaml', 'id: same\ndescription: A.\npaths:\n  model: model\n'),
    file('a/model/roles/user.yaml', 'id: user\n'),
    file('b/behavio.yaml', 'id: same\ndescription: B.\npaths:\n  model: model\n'),
    file('b/model/roles/admin.yaml', 'id: admin\n'),
  ]);

  assert.equal(manifest?.models.length, 2);
  assert.ok(manifest?.diagnostics.some((diagnostic) => diagnostic.message.includes('Duplicate manifest id')));
});

test('extracts Quiver-like archive using manifest model root', async () => {
  const result = await extractArchiveBytes(createZip({
    'docs/behavioml/behavio.yaml': 'id: quiver\ndescription: Quiver behavior workspace.\ninclude:\n  quic: quic/behavio.yaml\n',
    'docs/behavioml/quic/behavio.yaml': 'id: quic\ndescription: QUIC behavior model for Quiver.\npaths:\n  model: model\n',
    'docs/behavioml/quic/model/roles/user.yaml': 'id: user\n',
  }), 'quiver.zip');

  assert.equal(result.modelRoot, 'docs/behavioml/quic/model/');
  assert.deepEqual(result.files.map((entry) => entry.path), ['roles/user.yaml']);
  assert.equal(result.selectedManifestId, 'quic');
});

function file(path: string, content: string): WorkspaceFileEntry {
  return { path, content };
}

function createZip(files: Record<string, string>): ArrayBuffer {
  const encoded = Object.fromEntries(Object.entries(files).map(([path, content]) => [path, new TextEncoder().encode(content)]));
  const zipBuffer = zipSync(encoded);
  return zipBuffer.buffer.slice(zipBuffer.byteOffset, zipBuffer.byteOffset + zipBuffer.byteLength);
}
