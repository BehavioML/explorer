export type { ValidateWorkspaceCommand, ValidatorPort } from './commands';
export {
  createPathDerivedEntityIndex,
  createPathDerivedEntityKey,
  findSelectedEntity,
  getDefaultEntitySelection,
} from './entityIndex';
export type {
  ModelEntityExtension,
  ModelEntityScope,
  PathDerivedEntityIndex,
  PathDerivedEntityKey,
  PathDerivedEntityScopeGroup,
  PathDerivedEntitySelection,
  PathDerivedModelEntity,
} from './entityIndex';
export {
  createEmptySemanticReferenceIndex,
  createRelationshipNavigationTarget,
  createSelectedEntityRelationships,
  findPathDerivedEntityForReferenceEntity,
  findUnresolvedReferencesForDiagnostic,
  groupUnresolvedReferencesByTarget,
} from './relationships';
export type {
  RelationshipNavigationSide,
  RelationshipNavigationTarget,
  SelectedEntityRelationshipsViewModel,
  SemanticReferenceEntity,
  SemanticReferenceIndexViewModel,
  SemanticReferenceViewModel,
  UnresolvedReferenceTargetGroup,
} from './relationships';
export {
  createDiagnosticNavigationTarget,
  findDiagnosticsForEntity,
  findEntityForDiagnostic,
} from './diagnostics';
export type {
  DiagnosticNavigationStatus,
  DiagnosticSelection,
  EntitySummaryViewModel,
  DiagnosticSeverity,
  DiagnosticViewModel,
  ValidationResultViewModel,
  SemanticAreaEntitySummaryViewModel,
} from './diagnostics';
export { createSourceFileView, findSourceFileForEntity } from './sourceFileView';
export { normalizeSearchQuery, searchWorkspace } from './search';
export type { SourceFileViewModel } from './sourceFileView';
export type { SearchQuery, SearchResult, SearchResultKind, SearchWorkspaceInput } from './search';
export {
  countWorkspaceScopes,
  createValidatedWorkspaceOverview,
  createWorkspaceOverview,
  summarizeDiagnostics,
} from './workspaceOverview';
export type {
  BehavioMLModelScope,
  DiagnosticSummaryViewModel,
  WorkspaceOverviewInput,
  WorkspaceOverviewValidationStatus,
  WorkspaceOverviewViewModel,
  WorkspaceScopeCounts,
} from './workspaceOverview';
export { ApplicationError, adapterError, notImplemented } from './errors';
export type { ApplicationErrorKind } from './errors';
export {
  createDiagramCacheKey,
  createGeneratingDiagramViewModel,
  createSelectedEntityDiagramViewModelFromArtifacts,
  createStateMachineGeneratorLimitationViewModel,
  createUnsupportedEntityDiagramViewModel,
} from './diagrams';
export type {
  GeneratedDiagramArtifactViewModel,
  GeneratedDiagramRenderError,
  GeneratedDiagramSourceEntity,
  GeneratedDiagramStatus,
  SelectedEntityDiagramViewModel,
  WorkflowCompositionMode,
} from './diagrams';
export {
  BEHAVIOML_MODEL_SCOPE_DIRECTORIES,
  detectWorkspaceRoot,
  normalizeWorkspacePath,
} from './workspaceRootDetection';
export type {
  ArchiveExtractionResult,
  LoadedWorkspaceInput,
  LoadValidationStatus,
  WorkspaceFileEntry,
  WorkspaceRootDetectionResult,
} from './workspace';
