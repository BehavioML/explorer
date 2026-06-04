export interface WorkspaceFileEntry {
  readonly path: string;
  readonly content: string;
}

export interface LoadedWorkspaceInput {
  readonly files: readonly WorkspaceFileEntry[];
  readonly sourceLabel?: string;
  readonly modelRoot?: string;
}

export interface ArchiveExtractionResult {
  readonly files: readonly WorkspaceFileEntry[];
  readonly sourceLabel: string;
  readonly modelRoot: string;
}

export interface WorkspaceRootDetectionResult {
  readonly rootPath: string;
  readonly files: readonly WorkspaceFileEntry[];
}

export type LoadValidationStatus =
  | 'idle'
  | 'loading_archive'
  | 'validating_workspace'
  | 'validated'
  | 'adapter_error';
