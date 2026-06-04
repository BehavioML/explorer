import type { PathDerivedModelEntity } from './entityIndex';
import type { WorkspaceFileEntry } from './workspace';
import { normalizeWorkspacePath } from './workspaceRootDetection';

export interface SourceFileViewModel {
  readonly filePath: string;
  readonly content: string;
  readonly extension: string;
  readonly lineCount: number;
  readonly characterCount: number;
  readonly entityScope: PathDerivedModelEntity['scope'];
  readonly entityIdentity: string;
}

export function findSourceFileForEntity(
  files: readonly WorkspaceFileEntry[],
  entity: Pick<PathDerivedModelEntity, 'filePath'>,
): WorkspaceFileEntry | undefined {
  const entityFilePath = normalizeWorkspacePath(entity.filePath);

  return files.find((file) => normalizeWorkspacePath(file.path) === entityFilePath);
}

export function createSourceFileView(
  files: readonly WorkspaceFileEntry[],
  entity: PathDerivedModelEntity,
): SourceFileViewModel | undefined {
  const sourceFile = findSourceFileForEntity(files, entity);

  if (!sourceFile) {
    return undefined;
  }

  const filePath = normalizeWorkspacePath(sourceFile.path);

  return {
    filePath,
    content: sourceFile.content,
    extension: entity.extension,
    lineCount: countLines(sourceFile.content),
    characterCount: sourceFile.content.length,
    entityScope: entity.scope,
    entityIdentity: entity.identity,
  };
}

function countLines(content: string): number {
  if (content.length === 0) {
    return 0;
  }

  return content.split(/\r\n|\r|\n/).length;
}
