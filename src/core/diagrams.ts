import type { DiagnosticViewModel } from './diagnostics';
import type { PathDerivedModelEntity } from './entityIndex';

export type GeneratedDiagramStatus =
  | 'generated'
  | 'generating'
  | 'unsupported_entity'
  | 'unsupported_artifact'
  | 'generator_diagnostics'
  | 'empty_content'
  | 'adapter_error'
  | 'artifact_not_found'
  | 'malformed_artifact';

export interface GeneratedDiagramSourceEntity {
  readonly kind: string;
  readonly id: string;
}

export interface GeneratedDiagramRenderError {
  readonly message: string;
}

export interface GeneratedDiagramArtifactViewModel {
  readonly kind: string;
  readonly format: string;
  readonly title: string;
  readonly path: string;
  readonly content: string;
  readonly sourceEntity?: GeneratedDiagramSourceEntity;
  readonly sourceMap?: unknown;
  readonly diagnostics: readonly DiagnosticViewModel[];
}

export interface SelectedEntityDiagramViewModel {
  readonly status: GeneratedDiagramStatus;
  readonly title: string;
  readonly message: string;
  readonly sourceEntity?: GeneratedDiagramSourceEntity;
  readonly artifact?: GeneratedDiagramArtifactViewModel;
  readonly renderedSvg?: string;
  readonly renderError?: GeneratedDiagramRenderError;
  readonly diagnostics: readonly DiagnosticViewModel[];
}

export function createGeneratingDiagramViewModel(
  entity: Pick<PathDerivedModelEntity, 'displayName'> | undefined,
): SelectedEntityDiagramViewModel {
  return {
    status: 'generating',
    title: entity ? `Diagram: ${entity.displayName}` : 'Diagram',
    message: 'Generating diagram artifact with BehavioML Generator...',
    diagnostics: [],
  };
}

export function createUnsupportedEntityDiagramViewModel(
  entity: Pick<PathDerivedModelEntity, 'scope' | 'displayName'> | undefined,
): SelectedEntityDiagramViewModel {
  if (!entity) {
    return {
      status: 'unsupported_entity',
      title: 'Diagram',
      message: 'No entity is selected for diagram generation.',
      diagnostics: [],
    };
  }

  if (entity.scope === 'semantic-areas') {
    return {
      status: 'unsupported_artifact',
      title: `Diagram: ${entity.displayName}`,
      message:
        'Semantic-area diagrams require a semantic-area workflow artifact from BehavioML Generator; ' +
        'Explorer does not generate semantic-area Mermaid locally.',
      diagnostics: [],
    };
  }

  return {
    status: 'unsupported_entity',
    title: `Diagram: ${entity.displayName}`,
    message: `No generator-backed diagram view is available for ${entity.scope} entities yet.`,
    diagnostics: [],
  };
}

export function createStateMachineGeneratorLimitationViewModel(
  entity: Pick<PathDerivedModelEntity, 'identity' | 'displayName'>,
  diagnostics: readonly DiagnosticViewModel[] = [],
): SelectedEntityDiagramViewModel {
  return {
    status: 'unsupported_artifact',
    title: `Diagram: ${entity.displayName}`,
    message:
      `BehavioML Generator can produce aggregate state-machine Mermaid artifacts, ` +
      `but it does not yet expose a per-state-machine artifact for ${entity.identity}.`,
    diagnostics,
  };
}

export function createSelectedEntityDiagramViewModelFromArtifacts(
  entity: Pick<PathDerivedModelEntity, 'scope' | 'identity' | 'displayName'>,
  artifacts: readonly GeneratedDiagramArtifactViewModel[],
): SelectedEntityDiagramViewModel {
  if (entity.scope === 'workflows') {
    return selectWorkflowSequenceDiagram(entity, artifacts);
  }

  if (entity.scope === 'state-machines') {
    const relevant = artifacts.find((artifact) =>
      artifact.sourceEntity?.kind === 'state-machine' && artifact.sourceEntity.id === entity.identity,
    );

    if (relevant) {
      return createGeneratedDiagramViewModel(entity.displayName, relevant);
    }

    return createStateMachineGeneratorLimitationViewModel(
      entity,
      artifacts.flatMap((artifact) => artifact.diagnostics),
    );
  }

  return createUnsupportedEntityDiagramViewModel(entity);
}

function selectWorkflowSequenceDiagram(
  entity: Pick<PathDerivedModelEntity, 'identity' | 'displayName'>,
  artifacts: readonly GeneratedDiagramArtifactViewModel[],
): SelectedEntityDiagramViewModel {
  const exactArtifact = artifacts.find(
    (artifact) =>
      artifact.kind === 'workflow-sequence' &&
      artifact.sourceEntity?.kind === 'workflow' &&
      artifact.sourceEntity.id === entity.identity,
  );
  const fallbackArtifact = artifacts.find((artifact) => artifact.kind === 'workflow-sequence');
  const artifact = exactArtifact ?? fallbackArtifact;

  if (!artifact) {
    return {
      status: 'artifact_not_found',
      title: `Diagram: ${entity.displayName}`,
      message: `BehavioML Generator did not return a workflow sequence artifact for ${entity.identity}.`,
      diagnostics: artifacts.flatMap((candidate) => candidate.diagnostics),
    };
  }

  return createGeneratedDiagramViewModel(entity.displayName, artifact);
}

function createGeneratedDiagramViewModel(
  displayName: string,
  artifact: GeneratedDiagramArtifactViewModel,
): SelectedEntityDiagramViewModel {
  if (artifact.diagnostics.length > 0) {
    return {
      status: 'generator_diagnostics',
      title: artifact.title || `Diagram: ${displayName}`,
      message: 'BehavioML Generator reported diagnostics for this diagram artifact.',
      sourceEntity: artifact.sourceEntity,
      artifact,
      diagnostics: artifact.diagnostics,
    };
  }

  if (artifact.content.trim().length === 0) {
    return {
      status: 'empty_content',
      title: artifact.title || `Diagram: ${displayName}`,
      message: 'BehavioML Generator returned an empty diagram artifact.',
      sourceEntity: artifact.sourceEntity,
      artifact,
      diagnostics: [],
    };
  }

  return {
    status: 'generated',
    title: artifact.title || `Diagram: ${displayName}`,
    message: 'Generated Mermaid source from BehavioML Generator.',
    sourceEntity: artifact.sourceEntity,
    artifact,
    diagnostics: artifact.diagnostics,
  };
}
