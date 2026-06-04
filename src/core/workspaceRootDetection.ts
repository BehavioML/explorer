import { adapterError } from './errors';
import type { WorkspaceFileEntry, WorkspaceRootDetectionResult } from './workspace';

export const BEHAVIOML_MODEL_SCOPE_DIRECTORIES = [
  'workflows',
  'roles',
  'capabilities',
  'interfaces',
  'components',
  'modules',
  'entities',
  'events',
  'state-machines',
  'decisions',
] as const;

const ROOT_CANDIDATES = ['', 'behavioml/', 'behavioml/model/'] as const;

export function normalizeWorkspacePath(path: string): string {
  const segments: string[] = [];

  for (const rawSegment of path.replace(/\\/g, '/').split('/')) {
    const segment = rawSegment.trim();

    if (!segment || segment === '.') {
      continue;
    }

    if (segment === '..') {
      throw adapterError(
        'archive_extraction_failed',
        `Archive entry path "${path}" escapes the workspace root and cannot be loaded.`,
      );
    }

    segments.push(segment);
  }

  return segments.join('/');
}

export function detectWorkspaceRoot(
  files: readonly WorkspaceFileEntry[],
): WorkspaceRootDetectionResult {
  const normalizedFiles = files.map((file) => ({
    ...file,
    path: normalizeWorkspacePath(file.path),
  }));
  const plausibleRoots = ROOT_CANDIDATES.filter((candidate) =>
    containsKnownModelScopeDirectory(normalizedFiles, candidate),
  );

  if (plausibleRoots.length === 0) {
    throw adapterError(
      'workspace_root_not_found',
      'No BehavioML model root was found. Expected known model scope directories at the archive root, under behavioml/, or under behavioml/model/.',
    );
  }

  if (plausibleRoots.length > 1) {
    throw adapterError(
      'workspace_root_ambiguous',
      `Multiple BehavioML model roots were found: ${plausibleRoots.map(formatRoot).join(', ')}. Please upload an archive with a single model root.`,
    );
  }

  const rootPath = plausibleRoots[0];

  return {
    rootPath,
    files: normalizedFiles
      .filter((file) => file.path.startsWith(rootPath))
      .map((file) => ({
        ...file,
        path: file.path.slice(rootPath.length),
      }))
      .filter((file) => file.path.length > 0),
  };
}

function containsKnownModelScopeDirectory(
  files: readonly WorkspaceFileEntry[],
  rootPath: string,
): boolean {
  return files.some((file) => {
    if (!file.path.startsWith(rootPath)) {
      return false;
    }

    const relativePath = file.path.slice(rootPath.length);
    const [firstSegment] = relativePath.split('/');
    return BEHAVIOML_MODEL_SCOPE_DIRECTORIES.includes(
      firstSegment as (typeof BEHAVIOML_MODEL_SCOPE_DIRECTORIES)[number],
    );
  });
}

function formatRoot(rootPath: string): string {
  return rootPath === '' ? '<archive root>' : rootPath.replace(/\/$/, '');
}
