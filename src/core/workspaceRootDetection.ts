import { adapterError } from './errors';
import type { WorkspaceFileEntry, WorkspaceRootDetectionResult } from './workspace';

export const BEHAVIOML_MODEL_SCOPE_DIRECTORIES = [
  'workflows',
  'roles',
  'capabilities',
  'interfaces',
  'components',
  'modules',
  'semantic-areas',
  'events',
  'entities',
  'state-machines',
  'decisions',
] as const;

type BehavioMLModelScopeDirectory = (typeof BEHAVIOML_MODEL_SCOPE_DIRECTORIES)[number];

const CONVENTIONAL_ROOT_SUFFIXES = ['', 'behavioml/', 'behavioml/model/'] as const;
const SPECS_DIRECTORY = 'specs';
const BEHAVIOML_DRAFT_DIRECTORY = 'behavioml-draft';
const MODEL_DIRECTORY = 'model';
const GITHUB_DIRECTORY = '.github';

interface RootCandidate {
  readonly rootPath: string;
  readonly modelFileCount: number;
}

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
  const plausibleRoots = findPlausibleRoots(normalizedFiles);

  if (plausibleRoots.length === 0) {
    throw adapterError(
      'workspace_root_not_found',
      'No BehavioML model root was found. Expected known model scope directories at the archive root, under behavioml/, under behavioml/model/, under specs/<feature>/behavioml-draft/model/, or under the same layouts inside a single top-level GitHub ZIP wrapper directory.',
    );
  }

  if (plausibleRoots.length > 1) {
    throw adapterError(
      'workspace_root_ambiguous',
      `Multiple BehavioML model roots were found: ${plausibleRoots.map((root) => formatRoot(root.rootPath)).join(', ')}. Please upload an archive with a single model root.`,
    );
  }

  const rootPath = plausibleRoots[0].rootPath;

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

function findPlausibleRoots(files: readonly WorkspaceFileEntry[]): RootCandidate[] {
  const candidateRootPaths = collectCandidateRootPaths(files);
  return [...candidateRootPaths]
    .map((rootPath) => ({
      rootPath,
      modelFileCount: countKnownModelScopeFiles(files, rootPath),
    }))
    .filter((candidate) => candidate.modelFileCount > 0)
    .sort(compareRootsBySpecificity);
}

function collectCandidateRootPaths(files: readonly WorkspaceFileEntry[]): Set<string> {
  const rootPaths = new Set<string>();
  const layoutPrefixes = ['', ...getSingleTopLevelWrapperPrefixes(files)];

  for (const prefix of layoutPrefixes) {
    for (const suffix of CONVENTIONAL_ROOT_SUFFIXES) {
      const rootPath = `${prefix}${suffix}`;

      if (!isExcludedRootPath(rootPath)) {
        rootPaths.add(rootPath);
      }
    }
  }

  for (const file of files) {
    const segments = file.path.split('/');
    addFeatureLocalDraftCandidate(rootPaths, segments, 0);

    if (segments.length > 1) {
      addFeatureLocalDraftCandidate(rootPaths, segments, 1);
    }
  }

  return rootPaths;
}

function getSingleTopLevelWrapperPrefixes(
  files: readonly WorkspaceFileEntry[],
): readonly `${string}/`[] {
  const topLevelSegments = new Set<string>();

  for (const file of files) {
    const [topLevelSegment, secondSegment] = file.path.split('/');

    if (!topLevelSegment || !secondSegment) {
      return [];
    }

    topLevelSegments.add(topLevelSegment);

    if (topLevelSegments.size > 1) {
      return [];
    }
  }

  const [wrapperDirectory] = topLevelSegments;
  return wrapperDirectory ? [`${wrapperDirectory}/`] : [];
}

function addFeatureLocalDraftCandidate(
  rootPaths: Set<string>,
  segments: readonly string[],
  offset: number,
): void {
  if (
    segments[offset] !== SPECS_DIRECTORY ||
    !segments[offset + 1] ||
    segments[offset + 2] !== BEHAVIOML_DRAFT_DIRECTORY ||
    segments[offset + 3] !== MODEL_DIRECTORY
  ) {
    return;
  }

  const rootPath = `${segments.slice(0, offset + 4).join('/')}/`;

  if (!isExcludedRootPath(rootPath)) {
    rootPaths.add(rootPath);
  }
}

function countKnownModelScopeFiles(
  files: readonly WorkspaceFileEntry[],
  rootPath: string,
): number {
  return files.filter((file) => isKnownModelScopeFile(file.path, rootPath)).length;
}

function isKnownModelScopeFile(path: string, rootPath: string): boolean {
  if (!path.startsWith(rootPath)) {
    return false;
  }

  const relativePath = path.slice(rootPath.length);
  const [firstSegment, secondSegment] = relativePath.split('/');

  return Boolean(secondSegment) && isKnownModelScopeDirectory(firstSegment);
}

function isKnownModelScopeDirectory(
  segment: string | undefined,
): segment is BehavioMLModelScopeDirectory {
  return BEHAVIOML_MODEL_SCOPE_DIRECTORIES.includes(segment as BehavioMLModelScopeDirectory);
}

function compareRootsBySpecificity(a: RootCandidate, b: RootCandidate): number {
  return countPathSegments(b.rootPath) - countPathSegments(a.rootPath);
}

function countPathSegments(rootPath: string): number {
  return rootPath.split('/').filter(Boolean).length;
}

function isExcludedRootPath(rootPath: string): boolean {
  const rootSegments = rootPath.split('/').filter(Boolean);
  return rootSegments.at(-1) === GITHUB_DIRECTORY;
}

function formatRoot(rootPath: string): string {
  return rootPath === '' ? '<archive root>' : rootPath.replace(/\/$/, '');
}
