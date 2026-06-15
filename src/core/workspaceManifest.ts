import type { DiagnosticViewModel } from './diagnostics';
import type { WorkspaceFileEntry } from './workspace';
import { normalizeWorkspacePath } from './workspaceRootDetection';

export interface ResolvedModelManifest {
  readonly id: string;
  readonly description: string;
  readonly manifestPath: string;
  readonly modelRoot: string;
}

export interface ResolvedWorkspaceManifest {
  readonly id?: string;
  readonly description?: string;
  readonly entrypointPath?: string;
  readonly models: readonly ResolvedModelManifest[];
  readonly diagnostics: readonly DiagnosticViewModel[];
}

const ENTRYPOINT = 'docs/behavioml/behavio.yaml';
const IGNORED_SEGMENTS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);

type ParsedManifest = {
  id?: string;
  description?: string;
  paths?: Record<string, string>;
  include?: Record<string, string>;
};

export function resolveWorkspaceManifest(files: readonly WorkspaceFileEntry[]): ResolvedWorkspaceManifest | undefined {
  const fileMap = new Map(files.map((file) => [normalizeWorkspacePath(file.path), file]));
  const manifestPaths = [...fileMap.keys()]
    .filter((path) => path.endsWith('/behavio.yaml') || path === 'behavio.yaml')
    .filter((path) => !isIgnoredPath(path))
    .sort();

  if (manifestPaths.length === 0) return undefined;

  const entrypointPath = manifestPaths.includes(ENTRYPOINT) ? ENTRYPOINT : manifestPaths.find((path) => path === 'behavio.yaml') ?? manifestPaths[0];
  const diagnostics: DiagnosticViewModel[] = [];
  const models: ResolvedModelManifest[] = [];
  const seenPaths = new Set<string>();
  const seenIds = new Map<string, string>();

  resolveManifest(entrypointPath);

  const entry = parseManifestFile(entrypointPath, fileMap.get(entrypointPath)?.content ?? '', diagnostics);
  return { id: entry?.id, description: entry?.description, entrypointPath, models, diagnostics };

  function resolveManifest(path: string): void {
    const normalizedPath = normalizeWorkspacePath(path);
    if (seenPaths.has(normalizedPath) || isIgnoredPath(normalizedPath)) return;
    seenPaths.add(normalizedPath);

    const file = fileMap.get(normalizedPath);
    if (!file) {
      diagnostics.push(manifestDiagnostic('error', `Included manifest "${normalizedPath}" cannot be resolved.`, normalizedPath));
      return;
    }

    const manifest = parseManifestFile(normalizedPath, file.content, diagnostics);
    if (!manifest) return;

    validateManifestShape(manifest, normalizedPath, diagnostics);
    if (manifest.id) {
      const previous = seenIds.get(manifest.id);
      if (previous) {
        diagnostics.push(
          manifestDiagnostic(
            'error',
            `Duplicate manifest id "${manifest.id}" in ${previous} and ${normalizedPath}.`,
            normalizedPath,
          ),
        );
      } else {
        seenIds.set(manifest.id, normalizedPath);
      }
    }

    if (manifest.include) {
      for (const [includeId, includePath] of Object.entries(manifest.include)) {
        if (!includePath) continue;
        resolveManifest(resolveRelativePath(parentDirectory(normalizedPath), includePath));
        void includeId;
      }
    }

    if (manifest.paths) {
      const modelPath = manifest.paths.model;
      if (manifest.id && manifest.description && modelPath) {
        const modelRoot = ensureTrailingSlash(resolveRelativePath(parentDirectory(normalizedPath), modelPath));
        if (!workspacePathExists(files, modelRoot)) {
          diagnostics.push(manifestDiagnostic('error', `Resolved paths.model "${modelRoot}" does not exist.`, normalizedPath));
        }
        models.push({ id: manifest.id, description: manifest.description, manifestPath: normalizedPath, modelRoot });
      }
    }
  }
}

function parseManifestFile(path: string, content: string, diagnostics: DiagnosticViewModel[]): ParsedManifest | undefined {
  try {
    return parseSimpleYamlManifest(content);
  } catch (cause) {
    diagnostics.push(manifestDiagnostic('error', `Manifest "${path}" cannot be parsed: ${cause instanceof Error ? cause.message : 'invalid YAML'}.`, path));
    return undefined;
  }
}

function validateManifestShape(manifest: ParsedManifest, path: string, diagnostics: DiagnosticViewModel[]): void {
  if (!manifest.id) diagnostics.push(manifestDiagnostic('error', 'Manifest is missing required id.', path));
  if (!manifest.description) diagnostics.push(manifestDiagnostic('error', 'Manifest is missing required description.', path));
  if (!manifest.paths && !manifest.include) diagnostics.push(manifestDiagnostic('error', 'Manifest must define either paths or include.', path));
  if (manifest.paths && manifest.include) diagnostics.push(manifestDiagnostic('error', 'Manifest must not define both paths and include.', path));
  if (manifest.paths && !manifest.paths.model) diagnostics.push(manifestDiagnostic('error', 'Model manifest is missing paths.model.', path));
}

function parseSimpleYamlManifest(content: string): ParsedManifest {
  const manifest: ParsedManifest = {};
  let section: 'paths' | 'include' | undefined;

  for (const rawLine of content.split(/\r?\n/)) {
    const withoutComment = rawLine.replace(/\s+#.*$/, '');
    if (!withoutComment.trim()) continue;
    const indent = withoutComment.match(/^ */)?.[0].length ?? 0;
    const match = withoutComment.trim().match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (!match) throw new Error(`Unsupported manifest YAML line: ${rawLine.trim()}`);
    const [, key, rawValue = ''] = match;
    const value = unquote(rawValue.trim());

    if (indent === 0) {
      section = undefined;
      if (key === 'id' || key === 'description') manifest[key] = value;
      else if (key === 'paths' || key === 'include') {
        section = key;
        manifest[key] = {};
        if (value) throw new Error(`${key} must be a mapping`);
      }
    } else if (section) {
      manifest[section] = { ...(manifest[section] ?? {}), [key]: value };
    }
  }
  return manifest;
}

function unquote(value: string): string {
  return value.replace(/^['"](.*)['"]$/, '$1');
}

function resolveRelativePath(base: string, relativePath: string): string {
  return normalizeWorkspacePath(`${base}${relativePath}`);
}

function parentDirectory(path: string): string {
  const index = path.lastIndexOf('/');
  return index === -1 ? '' : `${path.slice(0, index)}/`;
}

function ensureTrailingSlash(path: string): string {
  return path.endsWith('/') ? path : `${path}/`;
}

function workspacePathExists(files: readonly WorkspaceFileEntry[], root: string): boolean {
  return files.some((file) => normalizeWorkspacePath(file.path).startsWith(root));
}

function isIgnoredPath(path: string): boolean {
  return path.split('/').some((segment) => IGNORED_SEGMENTS.has(segment));
}

function manifestDiagnostic(severity: DiagnosticViewModel['severity'], message: string, filePath: string): DiagnosticViewModel {
  return { severity, message: `[manifest] ${message}`, filePath };
}
