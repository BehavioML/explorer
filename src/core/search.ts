import type {
  PathDerivedEntityIndex,
  PathDerivedEntityKey,
  PathDerivedModelEntity,
} from './entityIndex';
import type { WorkspaceFileEntry } from './workspace';
import { normalizeWorkspacePath } from './workspaceRootDetection';

export type SearchResultKind = 'entity' | 'source_match';

export interface SearchQuery {
  readonly text: string;
  readonly maxResults?: number;
}

export interface SearchWorkspaceInput {
  readonly query: string | SearchQuery;
  readonly files: readonly WorkspaceFileEntry[];
  readonly entityIndex: PathDerivedEntityIndex;
}

export interface SearchResult {
  readonly kind: SearchResultKind;
  readonly entityKey?: PathDerivedEntityKey;
  readonly scope?: string;
  readonly identity?: string;
  readonly filePath?: string;
  readonly label: string;
  readonly matchText: string;
  readonly lineNumber?: number;
  readonly lineText?: string;
}

const DEFAULT_MAX_SEARCH_RESULTS = 100;

export function normalizeSearchQuery(query: string | SearchQuery): SearchQuery {
  if (typeof query === 'string') {
    return { text: query.trim(), maxResults: DEFAULT_MAX_SEARCH_RESULTS };
  }

  return {
    text: query.text.trim(),
    maxResults: normalizeMaxResults(query.maxResults),
  };
}

export function searchWorkspace({
  query,
  files,
  entityIndex,
}: SearchWorkspaceInput): readonly SearchResult[] {
  const normalizedQuery = normalizeSearchQuery(query);

  if (normalizedQuery.text.length === 0) {
    return [];
  }

  const maxResults = normalizedQuery.maxResults ?? DEFAULT_MAX_SEARCH_RESULTS;
  const needle = normalizedQuery.text.toLocaleLowerCase();
  const normalizedFiles = files.map((file) => ({
    path: normalizeWorkspacePath(file.path),
    content: file.content,
  }));
  const entityByPath = new Map(
    entityIndex.entities.map((entity) => [normalizeWorkspacePath(entity.filePath), entity]),
  );
  const results: SearchResult[] = [];

  appendEntityResults(
    results,
    entityIndex.entities,
    needle,
    (entity) => metadataMatchPriority(entity, needle) === 0,
    maxResults,
  );
  appendEntityResults(
    results,
    entityIndex.entities,
    needle,
    (entity) => metadataMatchPriority(entity, needle) === 1,
    maxResults,
  );
  appendSourceResults(results, normalizedFiles, entityByPath, needle, maxResults);

  return results;
}

function appendEntityResults(
  results: SearchResult[],
  entities: readonly PathDerivedModelEntity[],
  needle: string,
  matchesPriority: (entity: PathDerivedModelEntity) => boolean,
  maxResults: number,
): void {
  const seenEntityKeys = new Set(
    results
      .filter((result) => result.kind === 'entity' && result.entityKey)
      .map((result) => formatEntityKey(result.entityKey!)),
  );

  for (const entity of entities) {
    if (results.length >= maxResults) {
      return;
    }

    const entityKey = { scope: entity.scope, identity: entity.identity };
    const key = formatEntityKey(entityKey);

    if (seenEntityKeys.has(key) || !matchesPriority(entity)) {
      continue;
    }

    const matchedField = firstMatchingEntityField(entity, needle);

    if (!matchedField) {
      continue;
    }

    seenEntityKeys.add(key);
    results.push({
      kind: 'entity',
      entityKey,
      scope: entity.scope,
      identity: entity.identity,
      filePath: entity.filePath,
      label: entity.displayName,
      matchText: matchedField,
    });
  }
}

function appendSourceResults(
  results: SearchResult[],
  files: readonly { readonly path: string; readonly content: string }[],
  entityByPath: ReadonlyMap<string, PathDerivedModelEntity>,
  needle: string,
  maxResults: number,
): void {
  for (const file of files) {
    if (results.length >= maxResults) {
      return;
    }

    const entity = entityByPath.get(file.path);
    const lines = splitLines(file.content);

    for (const [lineIndex, lineText] of lines.entries()) {
      if (results.length >= maxResults) {
        return;
      }

      if (!contains(lineText, needle)) {
        continue;
      }

      results.push({
        kind: 'source_match',
        ...(entity
          ? {
              entityKey: { scope: entity.scope, identity: entity.identity },
              scope: entity.scope,
              identity: entity.identity,
            }
          : {}),
        filePath: file.path,
        label: entity ? entity.displayName : file.path,
        matchText: lineText,
        lineNumber: lineIndex + 1,
        lineText,
      });
    }
  }
}

function metadataMatchPriority(entity: PathDerivedModelEntity, needle: string): 0 | 1 | undefined {
  if (contains(entity.identity, needle) || contains(entity.displayName, needle)) {
    return 0;
  }

  if (contains(entity.scope, needle) || contains(entity.filePath, needle)) {
    return 1;
  }

  return undefined;
}

function firstMatchingEntityField(
  entity: PathDerivedModelEntity,
  needle: string,
): string | undefined {
  return [entity.identity, entity.displayName, entity.scope, entity.filePath].find((field) =>
    contains(field, needle),
  );
}

function contains(value: string, lowerCaseNeedle: string): boolean {
  return value.toLocaleLowerCase().includes(lowerCaseNeedle);
}

function formatEntityKey(entityKey: PathDerivedEntityKey): string {
  return `${entityKey.scope}:${entityKey.identity}`;
}

function normalizeMaxResults(maxResults: number | undefined): number {
  if (maxResults === undefined || !Number.isFinite(maxResults)) {
    return DEFAULT_MAX_SEARCH_RESULTS;
  }

  return Math.max(0, Math.floor(maxResults));
}

function splitLines(content: string): readonly string[] {
  if (content.length === 0) {
    return [];
  }

  return content.split(/\r\n|\r|\n/);
}
