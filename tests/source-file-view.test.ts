import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPathDerivedEntityIndex,
  createSourceFileView,
  findSourceFileForEntity,
  type WorkspaceFileEntry,
} from '../src/core';

test('finds a source file for the selected entity by exact normalized file path', () => {
  const files = [
    file('roles/admin.yaml', 'name: admin'),
    file('capabilities/send.yaml', 'name: send'),
  ];
  const entity = createPathDerivedEntityIndex(files).entities.find(
    (candidate) => candidate.filePath === 'roles/admin.yaml',
  );

  assert.ok(entity);
  assert.deepEqual(findSourceFileForEntity(files, entity), files[0]);
});

test('returns undefined when the selected entity source file is missing', () => {
  const [entity] = createPathDerivedEntityIndex([file('roles/admin.yaml', 'name: admin')]).entities;

  assert.equal(createSourceFileView([], entity), undefined);
});

test('counts source lines without parsing content', () => {
  const content = 'name: admin\n--- still raw\ninvalid: [unclosed';
  const [entity] = createPathDerivedEntityIndex([file('roles/admin.yaml', content)]).entities;

  const view = createSourceFileView([file('roles/admin.yaml', content)], entity);

  assert.equal(view?.lineCount, 3);
  assert.equal(view?.content, content);
});

test('reports source character count', () => {
  const content = 'ab\n😀';
  const [entity] = createPathDerivedEntityIndex([file('roles/admin.yaml', content)]).entities;

  const view = createSourceFileView([file('roles/admin.yaml', content)], entity);

  assert.equal(view?.characterCount, content.length);
});

test('normalizes workspace paths before exact source lookup', () => {
  const content = 'name: admin';
  const [entity] = createPathDerivedEntityIndex([file('./roles/admin.yaml', content)]).entities;

  const view = createSourceFileView([file('roles\\admin.yaml', content)], entity);

  assert.equal(view?.filePath, 'roles/admin.yaml');
  assert.equal(view?.content, content);
});

test('does not inspect YAML or JSON fields to build a source view', () => {
  const content = '{ "id": "different-semantic-id", "references": ["not-resolved"] }';
  const [entity] = createPathDerivedEntityIndex([file('entities/path_identity.json', content)]).entities;

  const view = createSourceFileView([file('entities/path_identity.json', content)], entity);

  assert.deepEqual(
    {
      entityIdentity: view?.entityIdentity,
      entityScope: view?.entityScope,
      content: view?.content,
    },
    {
      entityIdentity: 'path_identity',
      entityScope: 'entities',
      content,
    },
  );
});

function file(path: string, content: string): WorkspaceFileEntry {
  return { path, content };
}


test('displays semantic-area source as raw content without resolving workflow entries', () => {
  const content = 'name: Area\nworkflows:\n  - missing/workflow\n';
  const [entity] = createPathDerivedEntityIndex([
    file('semantic-areas/packet/protected_receive.yaml', content),
  ]).entities;

  const view = createSourceFileView([
    file('semantic-areas/packet/protected_receive.yaml', content),
  ], entity);

  assert.deepEqual(
    {
      entityIdentity: view?.entityIdentity,
      entityScope: view?.entityScope,
      content: view?.content,
    },
    {
      entityIdentity: 'packet/protected_receive',
      entityScope: 'semantic-areas',
      content,
    },
  );
});
