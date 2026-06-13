import type {
  DiagnosticViewModel,
  EntitySummaryViewModel,
  SemanticReferenceEntity,
  SemanticReferenceIndexViewModel,
  SemanticReferenceViewModel,
  ValidationResultViewModel,
  WorkspaceFileEntry,
} from '../../core';
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

interface ValidatorEntityLike {
  readonly scope?: unknown;
  readonly identity?: unknown;
  readonly file?: unknown;
  readonly filePath?: unknown;
  readonly document?: unknown;
}

interface ValidatorReferenceEntityLike {
  readonly scope?: unknown;
  readonly identity?: unknown;
  readonly file?: unknown;
  readonly filePath?: unknown;
}

interface ValidatorSemanticReferenceLike {
  readonly source?: unknown;
  readonly fieldPath?: unknown;
  readonly targetScope?: unknown;
  readonly targetIdentity?: unknown;
  readonly resolved?: unknown;
  readonly target?: unknown;
}

interface ValidatorReferenceIndexLike {
  readonly entities?: unknown;
  readonly outgoingReferences?: unknown;
  readonly incomingReferences?: unknown;
  readonly unresolvedReferences?: unknown;
}

interface ValidatorResultLike {
  readonly ok?: unknown;
  readonly valid?: unknown;
  readonly diagnostics?: unknown;
  readonly errors?: unknown;
  readonly warnings?: unknown;
  readonly summary?: unknown;
  readonly coverage?: unknown;
  readonly referenceIndex?: unknown;
  readonly entities?: unknown;
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
  // Keep the semantic engine behind this deferred adapter import so Validator
  // remains isolated from core and UI layers while Explorer consumes the
  // canonical Git dependency declared by Explorer.
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
    referenceIndex: toSemanticReferenceIndexViewModel(result?.referenceIndex),
    entitySummaries: toEntitySummaryArray(result?.entities),
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
    filePath: readString(diagnostic?.filePath) ?? readString(diagnostic?.file),
    fieldPath:
      readString(diagnostic?.fieldPath) ?? readString(diagnostic?.field) ?? readString(diagnostic?.path),
  };
}


function toEntitySummaryArray(value: unknown): EntitySummaryViewModel[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entity) => {
    const summary = toEntitySummaryViewModel(entity);

    return summary ? [summary] : [];
  });
}

function toEntitySummaryViewModel(value: unknown): EntitySummaryViewModel | undefined {
  const entity = asObject<ValidatorEntityLike>(value);
  const scope = readString(entity?.scope);

  if (scope !== 'semantic-areas') {
    return undefined;
  }

  const identity = readString(entity?.identity);

  if (!identity) {
    return undefined;
  }

  const document = asObject<Record<string, unknown>>(entity?.document);
  const displayName = readString(document?.name) ?? readString(document?.title);
  const description = readString(document?.description);

  return {
    scope,
    identity,
    filePath: readString(entity?.filePath) ?? readString(entity?.file),
    ...(displayName ? { displayName } : {}),
    ...(description ? { description } : {}),
    workflowReferences: toStringArray(document?.workflows),
  };
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

function toSemanticReferenceIndexViewModel(
  value: unknown,
): SemanticReferenceIndexViewModel | undefined {
  const referenceIndex = asObject<ValidatorReferenceIndexLike>(value);

  if (!referenceIndex) {
    return undefined;
  }

  return {
    entities: toReferenceEntityArray(referenceIndex.entities),
    outgoingReferences: toReferenceArray(referenceIndex.outgoingReferences),
    incomingReferences: toReferenceArray(referenceIndex.incomingReferences),
    unresolvedReferences: toReferenceArray(referenceIndex.unresolvedReferences),
  };
}

function toReferenceEntityArray(value: unknown): SemanticReferenceEntity[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entity) => {
    const viewModel = toReferenceEntityViewModel(entity);

    return viewModel ? [viewModel] : [];
  });
}

function toReferenceArray(value: unknown): SemanticReferenceViewModel[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((reference) => {
    const viewModel = toReferenceViewModel(reference);

    return viewModel ? [viewModel] : [];
  });
}

function toReferenceViewModel(value: unknown): SemanticReferenceViewModel | undefined {
  const reference = asObject<ValidatorSemanticReferenceLike>(value);
  const source = toReferenceEntityViewModel(reference?.source);
  const fieldPath = readString(reference?.fieldPath);
  const targetScope = readString(reference?.targetScope);
  const targetIdentity = readString(reference?.targetIdentity);

  if (!source || !fieldPath || !targetScope || !targetIdentity) {
    return undefined;
  }

  const target = toReferenceEntityViewModel(reference?.target);

  return {
    source,
    fieldPath,
    targetScope,
    targetIdentity,
    resolved: typeof reference?.resolved === 'boolean' ? reference.resolved : Boolean(target),
    ...(target ? { target } : {}),
  };
}

function toReferenceEntityViewModel(value: unknown): SemanticReferenceEntity | undefined {
  const entity = asObject<ValidatorReferenceEntityLike>(value);
  const scope = readString(entity?.scope);
  const identity = readString(entity?.identity);
  const filePath = readString(entity?.filePath) ?? readString(entity?.file);

  if (!scope || !identity) {
    return undefined;
  }

  return {
    scope,
    identity,
    ...(filePath ? { filePath } : {}),
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
