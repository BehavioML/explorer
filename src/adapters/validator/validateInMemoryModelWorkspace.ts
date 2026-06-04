import type { DiagnosticViewModel, ValidationResultViewModel, WorkspaceFileEntry } from '../../core';
import { ApplicationError } from '../../core';

type ValidatorModule = typeof import('@behavioml/validator');

export type ValidatorAdapterResult =
  | {
      readonly status: 'validated';
      readonly validation: ValidationResultViewModel;
      readonly rawResult: unknown;
    }
  | {
      readonly status: 'adapter_error';
      readonly error: ApplicationError;
    };

interface ValidatorDiagnosticLike {
  readonly severity?: unknown;
  readonly message?: unknown;
  readonly file?: unknown;
  readonly filePath?: unknown;
  readonly path?: unknown;
  readonly field?: unknown;
  readonly fieldPath?: unknown;
}

interface ValidatorResultLike {
  readonly ok?: unknown;
  readonly valid?: unknown;
  readonly diagnostics?: unknown;
  readonly errors?: unknown;
  readonly warnings?: unknown;
  readonly summary?: unknown;
  readonly coverage?: unknown;
}

export async function validateInMemoryModelWorkspace(
  files: readonly WorkspaceFileEntry[],
): Promise<ValidatorAdapterResult> {
  const validatorResult = await loadValidatorModule().then(
    (validator) => ({ status: 'loaded' as const, validator }),
    (cause: unknown) => ({ status: 'unavailable' as const, cause }),
  );

  if (validatorResult.status === 'unavailable') {
    return toAdapterError(validatorResult.cause);
  }

  try {
    const workspace = new validatorResult.validator.InMemoryWorkspace(files.map(normalizeWorkspaceFile));
    const rawResult = await validatorResult.validator.validateWorkspace(workspace);

    return {
      status: 'validated',
      validation: toValidationViewModel(rawResult),
      rawResult,
    };
  } catch (cause) {
    return toAdapterError(cause);
  }
}

function toAdapterError(cause: unknown): ValidatorAdapterResult {
  return {
    status: 'adapter_error',
    error: new ApplicationError(
      'validation_unavailable',
      'BehavioML Validator is not available to validate the in-memory workspace.',
      cause instanceof Error ? { cause } : undefined,
    ),
  };
}

async function loadValidatorModule(): Promise<ValidatorModule> {
  // @behavioml/validator is currently not published to npm. Keep the semantic
  // engine behind this deferred adapter import so the Explorer scaffold can
  // build while dependency wiring is resolved by a future integration PR.
  return import('@behavioml/validator');
}

function normalizeWorkspaceFile(file: WorkspaceFileEntry): WorkspaceFileEntry {
  return {
    path: file.path.replace(/\\/g, '/'),
    content: file.content,
  };
}

function toValidationViewModel(rawResult: unknown): ValidationResultViewModel {
  const result = asObject<ValidatorResultLike>(rawResult);
  const diagnostics = collectDiagnostics(result);

  return {
    ok: readOk(result, diagnostics),
    diagnostics,
    summary: result?.summary,
    coverage: result?.coverage,
  };
}

function collectDiagnostics(result: ValidatorResultLike | undefined): readonly DiagnosticViewModel[] {
  if (!result) {
    return [];
  }

  const diagnostics = [
    ...toDiagnosticArray(result.diagnostics),
    ...toDiagnosticArray(result.errors, 'error'),
    ...toDiagnosticArray(result.warnings, 'warning'),
  ];

  return diagnostics;
}

function toDiagnosticArray(value: unknown, defaultSeverity?: string): DiagnosticViewModel[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((diagnostic) => toDiagnosticViewModel(diagnostic, defaultSeverity));
}

function toDiagnosticViewModel(value: unknown, defaultSeverity = 'error'): DiagnosticViewModel {
  const diagnostic = asObject<ValidatorDiagnosticLike>(value);

  return {
    severity: readString(diagnostic?.severity) ?? defaultSeverity,
    message: readString(diagnostic?.message) ?? 'Validator reported a diagnostic without a message.',
    filePath:
      readString(diagnostic?.filePath) ?? readString(diagnostic?.file) ?? readString(diagnostic?.path),
    fieldPath: readString(diagnostic?.fieldPath) ?? readString(diagnostic?.field),
  };
}

function readOk(
  result: ValidatorResultLike | undefined,
  diagnostics: readonly DiagnosticViewModel[],
): boolean {
  if (typeof result?.ok === 'boolean') {
    return result.ok;
  }

  if (typeof result?.valid === 'boolean') {
    return result.valid;
  }

  return !diagnostics.some((diagnostic) => diagnostic.severity === 'error');
}

function asObject<T extends object>(value: unknown): T | undefined {
  return typeof value === 'object' && value !== null ? (value as T) : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
