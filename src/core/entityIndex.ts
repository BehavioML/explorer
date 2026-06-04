import type { WorkspaceFileEntry } from './workspace';
import {
  BEHAVIOML_MODEL_SCOPE_DIRECTORIES,
  normalizeWorkspacePath,
} from './workspaceRootDetection';

export type ModelEntityScope = (typeof BEHAVIOML_MODEL_SCOPE_DIRECTORIES)[number];

export interface PathDerivedModelEntity {
  readonly scope: ModelEntityScope;
  readonly identity: string;
  readonly filePath: string;
  readonly displayName: string;
  readonly extension: ModelEntityExtension;
}

export interface PathDerivedEntityScopeGroup {
  readonly scope: ModelEntityScope;
  readonly entities: readonly PathDerivedModelEntity[];
}

export interface PathDerivedEntityIndex {
  readonly scopes: readonly PathDerivedEntityScopeGroup[];
  readonly entities: readonly PathDerivedModelEntity[];
  readonly totalEntities: number;
}

export interface PathDerivedEntityKey {
  readonly scope: ModelEntityScope;
  readonly identity: string;
}

export type PathDerivedEntitySelection = PathDerivedEntityKey | undefined;

export type ModelEntityExtension = '.yaml' | '.yml' | '.json';

const MODEL_ENTITY_EXTENSIONS = ['.yaml', '.yml', '.json'] as const;

export function createPathDerivedEntityIndex(
  files: readonly WorkspaceFileEntry[],
): PathDerivedEntityIndex {
  const entitiesByScope = createEmptyEntityGroups();

  for (const file of files) {
    const entity = createPathDerivedEntity(file);

    if (entity) {
      entitiesByScope[entity.scope].push(entity);
    }
  }

  const scopes = BEHAVIOML_MODEL_SCOPE_DIRECTORIES.map((scope) => ({
    scope,
    entities: entitiesByScope[scope].sort(compareEntitiesByIdentity),
  }));
  const entities = scopes.flatMap((scopeGroup) => scopeGroup.entities);

  return {
    scopes,
    entities,
    totalEntities: entities.length,
  };
}

export function createPathDerivedEntityKey(
  entity: Pick<PathDerivedModelEntity, 'scope' | 'identity'>,
): PathDerivedEntityKey {
  return {
    scope: entity.scope,
    identity: entity.identity,
  };
}

export function findSelectedEntity(
  index: PathDerivedEntityIndex,
  selection: PathDerivedEntitySelection,
): PathDerivedModelEntity | undefined {
  if (!selection) {
    return undefined;
  }

  return index.entities.find(
    (entity) => entity.scope === selection.scope && entity.identity === selection.identity,
  );
}

export function getDefaultEntitySelection(
  index: PathDerivedEntityIndex,
): PathDerivedEntitySelection {
  const [firstEntity] = index.entities;

  return firstEntity ? createPathDerivedEntityKey(firstEntity) : undefined;
}

function createPathDerivedEntity(file: WorkspaceFileEntry): PathDerivedModelEntity | undefined {
  const filePath = normalizeWorkspacePath(file.path);
  const segments = filePath.split('/');
  const [scopeCandidate, ...identitySegments] = segments;

  if (!isModelEntityScope(scopeCandidate) || identitySegments.length === 0) {
    return undefined;
  }

  const fileName = identitySegments[identitySegments.length - 1];
  const extension = getModelEntityExtension(fileName);

  if (!extension) {
    return undefined;
  }

  const lastIdentitySegment = fileName.slice(0, -extension.length);

  if (lastIdentitySegment.length === 0) {
    return undefined;
  }

  const identity = [...identitySegments.slice(0, -1), lastIdentitySegment].join('/');
  const displayName = lastIdentitySegment;

  return {
    scope: scopeCandidate,
    identity,
    filePath,
    displayName,
    extension,
  };
}

function createEmptyEntityGroups(): Record<ModelEntityScope, PathDerivedModelEntity[]> {
  return BEHAVIOML_MODEL_SCOPE_DIRECTORIES.reduce(
    (groups, scope) => ({
      ...groups,
      [scope]: [],
    }),
    {} as Record<ModelEntityScope, PathDerivedModelEntity[]>,
  );
}

function compareEntitiesByIdentity(
  left: PathDerivedModelEntity,
  right: PathDerivedModelEntity,
): number {
  return left.identity.localeCompare(right.identity);
}

function getModelEntityExtension(fileName: string): ModelEntityExtension | undefined {
  const lowerCaseName = fileName.toLowerCase();

  return MODEL_ENTITY_EXTENSIONS.find((extension) => lowerCaseName.endsWith(extension));
}

function isModelEntityScope(scope: string | undefined): scope is ModelEntityScope {
  return BEHAVIOML_MODEL_SCOPE_DIRECTORIES.includes(scope as ModelEntityScope);
}
