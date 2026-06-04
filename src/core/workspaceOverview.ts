import type { DiagnosticViewModel, ValidationResultViewModel } from './diagnostics';
import type { WorkspaceFileEntry } from './workspace';
import {
  BEHAVIOML_MODEL_SCOPE_DIRECTORIES,
  normalizeWorkspacePath,
} from './workspaceRootDetection';

export type BehavioMLModelScope = (typeof BEHAVIOML_MODEL_SCOPE_DIRECTORIES)[number];

export type WorkspaceOverviewValidationStatus =
  | 'not_run'
  | 'running'
  | 'valid'
  | 'has_diagnostics'
  | 'validation_unavailable';

export type WorkspaceScopeCounts = Record<BehavioMLModelScope, number>;

export interface DiagnosticSummaryViewModel {
  readonly errors: number;
  readonly warnings: number;
  readonly other: number;
}

export interface WorkspaceOverviewViewModel {
  readonly sourceLabel: string;
  readonly modelRoot: string;
  readonly validationFileCount: number;
  readonly scopeCounts: WorkspaceScopeCounts;
  readonly validationStatus: WorkspaceOverviewValidationStatus;
  readonly diagnosticSummary: DiagnosticSummaryViewModel;
}

export interface WorkspaceOverviewInput {
  readonly sourceLabel?: string;
  readonly modelRoot?: string;
  readonly files: readonly WorkspaceFileEntry[];
  readonly validationStatus?: WorkspaceOverviewValidationStatus;
  readonly diagnostics?: readonly DiagnosticViewModel[];
}

export function createWorkspaceOverview(input: WorkspaceOverviewInput): WorkspaceOverviewViewModel {
  return {
    sourceLabel: input.sourceLabel ?? 'Unknown source',
    modelRoot: input.modelRoot && input.modelRoot.length > 0 ? input.modelRoot : '<archive root>',
    validationFileCount: input.files.length,
    scopeCounts: countWorkspaceScopes(input.files),
    validationStatus: input.validationStatus ?? 'not_run',
    diagnosticSummary: summarizeDiagnostics(input.diagnostics ?? []),
  };
}

export function createValidatedWorkspaceOverview(input: {
  readonly sourceLabel?: string;
  readonly modelRoot?: string;
  readonly files: readonly WorkspaceFileEntry[];
  readonly validation: ValidationResultViewModel;
}): WorkspaceOverviewViewModel {
  return createWorkspaceOverview({
    sourceLabel: input.sourceLabel,
    modelRoot: input.modelRoot,
    files: input.files,
    validationStatus: input.validation.diagnostics.length > 0 ? 'has_diagnostics' : 'valid',
    diagnostics: input.validation.diagnostics,
  });
}

export function countWorkspaceScopes(files: readonly WorkspaceFileEntry[]): WorkspaceScopeCounts {
  const counts = createEmptyScopeCounts();

  for (const file of files) {
    const [firstSegment] = normalizeWorkspacePath(file.path).split('/');

    if (isBehavioMLModelScope(firstSegment)) {
      counts[firstSegment] += 1;
    }
  }

  return counts;
}

export function summarizeDiagnostics(
  diagnostics: readonly DiagnosticViewModel[],
): DiagnosticSummaryViewModel {
  return diagnostics.reduce<DiagnosticSummaryViewModel>(
    (summary, diagnostic) => {
      const severity = diagnostic.severity.toLowerCase();

      if (severity === 'error') {
        return { ...summary, errors: summary.errors + 1 };
      }

      if (severity === 'warning' || severity === 'warn') {
        return { ...summary, warnings: summary.warnings + 1 };
      }

      return { ...summary, other: summary.other + 1 };
    },
    { errors: 0, warnings: 0, other: 0 },
  );
}

function createEmptyScopeCounts(): WorkspaceScopeCounts {
  return Object.fromEntries(
    BEHAVIOML_MODEL_SCOPE_DIRECTORIES.map((scope) => [scope, 0]),
  ) as WorkspaceScopeCounts;
}

function isBehavioMLModelScope(scope: string | undefined): scope is BehavioMLModelScope {
  return BEHAVIOML_MODEL_SCOPE_DIRECTORIES.includes(scope as BehavioMLModelScope);
}
