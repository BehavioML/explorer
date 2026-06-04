declare module '@behavioml/validator' {
  export interface ValidatorWorkspaceFileEntry {
    readonly path: string;
    readonly content: string;
  }

  export class InMemoryWorkspace {
    constructor(files: readonly ValidatorWorkspaceFileEntry[]);
  }

  export function createInMemoryWorkspace(
    files: readonly ValidatorWorkspaceFileEntry[],
  ): InMemoryWorkspace;

  export function validateWorkspace(workspace: InMemoryWorkspace): Promise<unknown>;
  export function loadWorkspace(workspaceOrModelDir: InMemoryWorkspace | string): Promise<unknown>;
}
