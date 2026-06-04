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
export type { DiagnosticSeverity, DiagnosticViewModel, ValidationResultViewModel } from './diagnostics';
export { createSourceFileView, findSourceFileForEntity } from './sourceFileView';
export type { SourceFileViewModel } from './sourceFileView';
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
