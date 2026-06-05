import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const repoRootPath = path.resolve(new URL('..', import.meta.url).pathname);

async function sourceFiles(relativeDir) {
  const absoluteDir = path.join(repoRootPath, relativeDir);
  const files = [];

  async function walk(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await walk(entryPath);
        continue;
      }

      if (/\.(ts|tsx)$/.test(entry.name)) {
        files.push(path.relative(repoRootPath, entryPath));
      }
    }
  }

  await walk(absoluteDir);
  return files;
}

async function readSources(relativeDir) {
  const files = await sourceFiles(relativeDir);
  return Promise.all(
    files.map(async (file) => ({
      file,
      content: await readFile(path.join(repoRootPath, file), 'utf8'),
    })),
  );
}

test('core stays framework and browser API independent', async () => {
  const sources = await readSources('src/core');
  const forbiddenPatterns = [
    /from ['"]react['"]/,
    /from ['"]react-dom/,
    /\b(document|window|File|Blob|ArrayBuffer|HTMLElement|EventTarget)\b/,
  ];

  for (const { file, content } of sources) {
    for (const pattern of forbiddenPatterns) {
      assert.doesNotMatch(content, pattern, `${file} must not match ${pattern}`);
    }
  }
});

test('React UI does not import the BehavioML Validator directly', async () => {
  const sources = await readSources('src/ui-react');

  for (const { file, content } of sources) {
    assert.doesNotMatch(content, /@behavioml\/validator/, `${file} must use adapter boundaries`);
  }
});

test('Validator package imports remain isolated to the validator adapter', async () => {
  const sources = await readSources('src');
  const offenders = sources.filter(
    ({ file, content }) =>
      content.includes('@behavioml/validator') && !file.startsWith('src/adapters/validator/'),
  );

  assert.deepEqual(
    offenders.map((offender) => offender.file),
    [],
    'Only src/adapters/validator may reference @behavioml/validator',
  );
});


test('React UI does not import the BehavioML Generator directly', async () => {
  const sources = await readSources('src/ui-react');

  for (const { file, content } of sources) {
    assert.doesNotMatch(content, /@behavioml\/generator/, `${file} must use adapter boundaries`);
  }
});

test('Generator package imports remain isolated to the generator adapter', async () => {
  const sources = await readSources('src');
  const offenders = sources.filter(
    ({ file, content }) =>
      content.includes('@behavioml/generator') && !file.startsWith('src/adapters/generator/'),
  );

  assert.deepEqual(
    offenders.map((offender) => offender.file),
    [],
    'Only src/adapters/generator may reference @behavioml/generator',
  );
});

test('React UI does not import Mermaid directly', async () => {
  const sources = await readSources('src/ui-react');

  for (const { file, content } of sources) {
    assert.doesNotMatch(content, /from ['"]mermaid['"]|import\(['"]mermaid['"]\)/, `${file} must use adapter boundaries`);
  }
});

test('Mermaid package imports remain isolated to the Mermaid adapter', async () => {
  const sources = await readSources('src');
  const offenders = sources.filter(
    ({ file, content }) =>
      (/from ['"]mermaid['"]|import\(['"]mermaid['"]\)/).test(content) &&
      !file.startsWith('src/adapters/mermaid/'),
  );

  assert.deepEqual(
    offenders.map((offender) => offender.file),
    [],
    'Only src/adapters/mermaid may import mermaid',
  );
});
