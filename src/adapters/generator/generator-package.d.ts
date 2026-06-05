declare module '@behavioml/generator' {
  export interface GeneratorWorkspaceFile {
    readonly path: string;
    readonly content: string;
  }

  export interface GeneratorArtifactSourceMapEntry {
    readonly diagramId: string;
    readonly role: string;
    readonly entity: {
      readonly scope: string;
      readonly identity: string;
    };
    readonly fieldPath?: string;
    readonly label?: string;
  }

  export interface GenerateWorkspaceArtifactsOptions {
    readonly artifacts?: readonly string[];
    readonly formats?: readonly string[];
    readonly workflow?: string;
    readonly expandUses?: 'one-level' | 'recursive' | 'none' | boolean;
  }

  export function generateWorkspaceArtifacts(
    files: readonly GeneratorWorkspaceFile[],
    options?: GenerateWorkspaceArtifactsOptions,
  ): Promise<readonly unknown[]>;

  export function generateModelArtifacts(model: unknown, options?: GenerateWorkspaceArtifactsOptions): readonly unknown[];
  export function loadWorkspaceModel(files: readonly GeneratorWorkspaceFile[]): unknown;
}
