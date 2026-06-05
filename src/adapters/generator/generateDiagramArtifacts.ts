import type {
  DiagnosticViewModel,
  GeneratedDiagramArtifactViewModel,
  PathDerivedModelEntity,
  SelectedEntityDiagramViewModel,
  WorkspaceFileEntry,
} from '../../core';
import {
  ApplicationError,
  createSelectedEntityDiagramViewModelFromArtifacts,
  createStateMachineGeneratorLimitationViewModel,
  createUnsupportedEntityDiagramViewModel,
} from '../../core';

type GeneratorModule = typeof import('@behavioml/generator');

export interface GenerateDiagramArtifactsForWorkspaceOptions {
  readonly artifacts?: readonly string[];
  readonly formats?: readonly string[];
  readonly workflow?: string;
  readonly expandUses?: 'one-level' | 'recursive' | 'none' | boolean;
  readonly moduleLoader?: () => Promise<GeneratorModuleLike>;
}

export type GeneratorAdapterResult =
  | {
      readonly status: 'generated';
      readonly artifacts: readonly GeneratedDiagramArtifactViewModel[];
      readonly rawArtifacts: unknown;
    }
  | {
      readonly status: 'adapter_error';
      readonly error: ApplicationError;
    };

interface GeneratorModuleLike {
  readonly generateWorkspaceArtifacts: (
    files: readonly WorkspaceFileEntry[],
    options?: {
      readonly artifacts?: readonly string[];
      readonly formats?: readonly string[];
      readonly workflow?: string;
      readonly expandUses?: 'one-level' | 'recursive' | 'none' | boolean;
    },
  ) => Promise<readonly unknown[]> | readonly unknown[];
}

interface GeneratorDiagnosticLike {
  readonly severity?: unknown;
  readonly message?: unknown;
  readonly file?: unknown;
  readonly filePath?: unknown;
  readonly path?: unknown;
  readonly field?: unknown;
  readonly fieldPath?: unknown;
}

interface GeneratorSourceEntityLike {
  readonly kind?: unknown;
  readonly id?: unknown;
  readonly scope?: unknown;
  readonly identity?: unknown;
}

interface GeneratorArtifactLike {
  readonly kind?: unknown;
  readonly format?: unknown;
  readonly title?: unknown;
  readonly path?: unknown;
  readonly content?: unknown;
  readonly sourceEntity?: unknown;
  readonly diagnostics?: unknown;
}

export async function generateDiagramArtifactsForWorkspace(
  files: readonly WorkspaceFileEntry[],
  options: GenerateDiagramArtifactsForWorkspaceOptions = {},
): Promise<GeneratorAdapterResult> {
  const generatorResult = await loadGeneratorModule(options.moduleLoader).then(
    (generator) => ({ status: 'loaded' as const, generator }),
    (cause: unknown) => ({ status: 'unavailable' as const, cause }),
  );

  if (generatorResult.status === 'unavailable') {
    return toAdapterError(generatorResult.cause);
  }

  try {
    const { moduleLoader: _moduleLoader, ...generatorOptions } = options;
    void _moduleLoader;
    const rawArtifacts = await generatorResult.generator.generateWorkspaceArtifacts(
      files.map(normalizeWorkspaceFile),
      generatorOptions,
    );

    if (!Array.isArray(rawArtifacts)) {
      return malformedAdapterResult('BehavioML Generator returned a malformed artifact collection.', rawArtifacts);
    }

    return {
      status: 'generated',
      artifacts: rawArtifacts.map(toGeneratedDiagramArtifactViewModel),
      rawArtifacts,
    };
  } catch (cause) {
    return toAdapterError(cause);
  }
}

export async function generateDiagramArtifactForEntity(
  files: readonly WorkspaceFileEntry[],
  entity: PathDerivedModelEntity | undefined,
  options: GenerateDiagramArtifactsForWorkspaceOptions = {},
): Promise<SelectedEntityDiagramViewModel> {
  if (!entity) {
    return createUnsupportedEntityDiagramViewModel(entity);
  }

  if (entity.scope !== 'workflows' && entity.scope !== 'state-machines') {
    return createUnsupportedEntityDiagramViewModel(entity);
  }

  const artifactOptions = toEntityArtifactOptions(entity, options);
  const result = await generateDiagramArtifactsForWorkspace(files, artifactOptions);

  if (result.status === 'adapter_error') {
    return {
      status: 'adapter_error',
      title: `Diagram: ${entity.displayName}`,
      message: result.error.message,
      diagnostics: [],
    };
  }

  if (entity.scope === 'state-machines') {
    const relevant = result.artifacts.find(
      (artifact) =>
        artifact.sourceEntity?.kind === 'state-machine' && artifact.sourceEntity.id === entity.identity,
    );

    if (!relevant) {
      return createStateMachineGeneratorLimitationViewModel(
        entity,
        result.artifacts.flatMap((artifact) => artifact.diagnostics),
      );
    }
  }

  return createSelectedEntityDiagramViewModelFromArtifacts(entity, result.artifacts);
}

export function toGeneratedDiagramArtifactViewModel(rawArtifact: unknown): GeneratedDiagramArtifactViewModel {
  const artifact = asObject<GeneratorArtifactLike>(rawArtifact);
  const diagnostics = toDiagnosticArray(artifact?.diagnostics);
  const sourceEntity = toSourceEntityViewModel(artifact?.sourceEntity);
  const kind = readString(artifact?.kind) ?? 'malformed-artifact';
  const format = readString(artifact?.format) ?? 'text';
  const path = readString(artifact?.path) ?? '';
  const title = readString(artifact?.title) ?? kind;
  const content = readString(artifact?.content) ?? '';

  if (!artifact) {
    return {
      kind,
      format,
      title,
      path,
      content,
      diagnostics: [
        {
          severity: 'error',
          message: 'BehavioML Generator returned a malformed diagram artifact.',
        },
      ],
    };
  }

  return {
    kind,
    format,
    title,
    path,
    content,
    ...(sourceEntity ? { sourceEntity } : {}),
    diagnostics,
  };
}

function toEntityArtifactOptions(
  entity: PathDerivedModelEntity,
  options: GenerateDiagramArtifactsForWorkspaceOptions,
): GenerateDiagramArtifactsForWorkspaceOptions {
  if (entity.scope === 'workflows') {
    return {
      ...options,
      artifacts: [`workflow-sequence:${entity.identity}`],
      formats: ['mermaid'],
      workflow: entity.identity,
    };
  }

  return {
    ...options,
    artifacts: ['state-machines'],
    formats: ['mermaid'],
  };
}

function malformedAdapterResult(message: string, _rawArtifacts: unknown): GeneratorAdapterResult {
  return {
    status: 'adapter_error',
    error: new ApplicationError('adapter_error', message, undefined),
  };
}

function toAdapterError(cause: unknown): GeneratorAdapterResult {
  return {
    status: 'adapter_error',
    error: new ApplicationError(
      'adapter_error',
      'BehavioML Generator is not available to generate in-memory diagram artifacts.',
      cause instanceof Error ? { cause } : undefined,
    ),
  };
}

async function loadGeneratorModule(
  moduleLoader: (() => Promise<GeneratorModuleLike>) | undefined,
): Promise<GeneratorModuleLike> {
  if (moduleLoader) {
    return moduleLoader();
  }

  // Keep generated-artifact semantics behind this deferred adapter import so
  // Generator remains isolated from core and UI layers while Explorer consumes
  // the pinned Git dependency from in-memory workspace files.
  return import('@behavioml/generator') satisfies Promise<GeneratorModule>;
}

function normalizeWorkspaceFile(file: WorkspaceFileEntry): WorkspaceFileEntry {
  return {
    path: file.path.replace(/\\/g, '/'),
    content: file.content,
  };
}

function toDiagnosticArray(value: unknown): DiagnosticViewModel[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(toDiagnosticViewModel);
}

function toDiagnosticViewModel(value: unknown): DiagnosticViewModel {
  const diagnostic = asObject<GeneratorDiagnosticLike>(value);

  const filePath = readString(diagnostic?.filePath) ?? readString(diagnostic?.file);
  const fieldPath =
    readString(diagnostic?.fieldPath) ?? readString(diagnostic?.field) ?? readString(diagnostic?.path);

  return {
    severity: readString(diagnostic?.severity) ?? 'error',
    message: readString(diagnostic?.message) ?? 'Generator reported a diagnostic without a message.',
    ...(filePath ? { filePath } : {}),
    ...(fieldPath ? { fieldPath } : {}),
  };
}

function toSourceEntityViewModel(value: unknown): GeneratedDiagramArtifactViewModel['sourceEntity'] {
  const sourceEntity = asObject<GeneratorSourceEntityLike>(value);
  const kind = readString(sourceEntity?.kind) ?? readString(sourceEntity?.scope);
  const id = readString(sourceEntity?.id) ?? readString(sourceEntity?.identity);

  if (!kind || !id) {
    return undefined;
  }

  return { kind, id };
}

function asObject<T extends object>(value: unknown): T | undefined {
  return typeof value === 'object' && value !== null ? (value as T) : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
