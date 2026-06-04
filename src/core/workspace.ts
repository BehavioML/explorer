export interface WorkspaceFileEntry {
  readonly path: string;
  readonly content: string;
}

export interface LoadedWorkspaceInput {
  readonly files: readonly WorkspaceFileEntry[];
  readonly sourceLabel?: string;
}
