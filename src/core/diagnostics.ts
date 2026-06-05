import type { SemanticReferenceIndexViewModel } from './relationships';
import type {
  PathDerivedEntityIndex,
  PathDerivedEntityKey,
  PathDerivedModelEntity,
} from './entityIndex';
import { createPathDerivedEntityKey } from './entityIndex';
import { normalizeWorkspacePath } from './workspaceRootDetection';

export type DiagnosticSeverity = 'error' | 'warning' | 'info' | string;

export interface DiagnosticViewModel {
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly filePath?: string;
  readonly fieldPath?: string;
}

export interface ValidationResultViewModel {
  readonly ok: boolean;
  readonly diagnostics: readonly DiagnosticViewModel[];
  readonly summary?: unknown;
  readonly coverage?: unknown;
  readonly referenceIndex?: SemanticReferenceIndexViewModel;
}

export type DiagnosticNavigationStatus =
  | 'matched_entity'
  | 'missing_file_path'
  | 'unmatched_file_path';

export interface DiagnosticSelection {
  readonly diagnostic: DiagnosticViewModel;
  readonly status: DiagnosticNavigationStatus;
  readonly entityKey?: PathDerivedEntityKey;
}

export function findEntityForDiagnostic(
  index: PathDerivedEntityIndex,
  diagnostic: Pick<DiagnosticViewModel, 'filePath'>,
): PathDerivedEntityKey | undefined {
  if (!diagnostic.filePath) {
    return undefined;
  }

  const diagnosticFilePath = normalizeWorkspacePath(diagnostic.filePath);
  const matchingEntity = index.entities.find(
    (entity) => normalizeWorkspacePath(entity.filePath) === diagnosticFilePath,
  );

  return matchingEntity ? createPathDerivedEntityKey(matchingEntity) : undefined;
}

export function findDiagnosticsForEntity(
  diagnostics: readonly DiagnosticViewModel[],
  entity: Pick<PathDerivedModelEntity, 'filePath'>,
): readonly DiagnosticViewModel[] {
  const entityFilePath = normalizeWorkspacePath(entity.filePath);

  return diagnostics.filter((diagnostic) => {
    if (diagnostic.filePath === undefined) {
      return false;
    }

    return normalizeWorkspacePath(diagnostic.filePath) === entityFilePath;
  });
}

export function createDiagnosticNavigationTarget(
  index: PathDerivedEntityIndex,
  diagnostic: DiagnosticViewModel,
): DiagnosticSelection {
  if (!diagnostic.filePath) {
    return {
      diagnostic,
      status: 'missing_file_path',
    };
  }

  const entityKey = findEntityForDiagnostic(index, diagnostic);

  if (!entityKey) {
    return {
      diagnostic,
      status: 'unmatched_file_path',
    };
  }

  return {
    diagnostic,
    status: 'matched_entity',
    entityKey,
  };
}
