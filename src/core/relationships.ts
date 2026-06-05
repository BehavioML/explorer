import type {
  PathDerivedEntityIndex,
  PathDerivedEntityKey,
  PathDerivedModelEntity,
} from './entityIndex';
import { createPathDerivedEntityKey } from './entityIndex';
import { normalizeWorkspacePath } from './workspaceRootDetection';

export interface SemanticReferenceEntity {
  readonly scope: string;
  readonly identity: string;
  readonly filePath?: string;
}

export interface SemanticReferenceViewModel {
  readonly source: SemanticReferenceEntity;
  readonly fieldPath: string;
  readonly targetScope: string;
  readonly targetIdentity: string;
  readonly resolved: boolean;
  readonly target?: SemanticReferenceEntity;
}

export interface SemanticReferenceIndexViewModel {
  readonly entities: readonly SemanticReferenceEntity[];
  readonly outgoingReferences: readonly SemanticReferenceViewModel[];
  readonly incomingReferences: readonly SemanticReferenceViewModel[];
  readonly unresolvedReferences: readonly SemanticReferenceViewModel[];
}

export interface SelectedEntityRelationshipsViewModel {
  readonly entity: PathDerivedModelEntity;
  readonly outgoingReferences: readonly SemanticReferenceViewModel[];
  readonly incomingReferences: readonly SemanticReferenceViewModel[];
  readonly unresolvedReferences: readonly SemanticReferenceViewModel[];
  readonly unresolvedReferencesByTarget: readonly UnresolvedReferenceTargetGroup[];
}

export interface UnresolvedReferenceTargetGroup {
  readonly targetScope: string;
  readonly targetIdentity: string;
  readonly references: readonly SemanticReferenceViewModel[];
}

export type RelationshipNavigationSide = 'source' | 'target';

export type RelationshipNavigationTarget =
  | {
      readonly status: 'matched_entity';
      readonly entityKey: PathDerivedEntityKey;
    }
  | {
      readonly status: 'unresolved_reference';
    }
  | {
      readonly status: 'missing_source';
    }
  | {
      readonly status: 'missing_target';
    }
  | {
      readonly status: 'unmatched_source';
    }
  | {
      readonly status: 'unmatched_target';
    };

export function createEmptySemanticReferenceIndex(): SemanticReferenceIndexViewModel {
  return {
    entities: [],
    outgoingReferences: [],
    incomingReferences: [],
    unresolvedReferences: [],
  };
}

export function createSelectedEntityRelationships(
  referenceIndex: SemanticReferenceIndexViewModel | undefined,
  entity: PathDerivedModelEntity | undefined,
): SelectedEntityRelationshipsViewModel | undefined {
  if (!referenceIndex || !entity) {
    return undefined;
  }

  const outgoingReferences = referenceIndex.outgoingReferences.filter((reference) =>
    isReferenceEntityMatch(reference.source, entity),
  );
  const incomingReferences = referenceIndex.incomingReferences.filter((reference) =>
    isReferenceTargetMatch(reference, entity),
  );
  const unresolvedReferences = referenceIndex.unresolvedReferences.filter(
    (reference) =>
      isReferenceEntityMatch(reference.source, entity) ||
      isReferenceTargetIdentityMatch(reference, entity),
  );

  return {
    entity,
    outgoingReferences,
    incomingReferences,
    unresolvedReferences,
    unresolvedReferencesByTarget: groupUnresolvedReferencesByTarget(unresolvedReferences),
  };
}

export function groupUnresolvedReferencesByTarget(
  references: readonly SemanticReferenceViewModel[],
): readonly UnresolvedReferenceTargetGroup[] {
  const groups = new Map<string, SemanticReferenceViewModel[]>();

  for (const reference of references) {
    const key = createTargetKey(reference.targetScope, reference.targetIdentity);
    const group = groups.get(key);

    if (group) {
      group.push(reference);
    } else {
      groups.set(key, [reference]);
    }
  }

  return [...groups.entries()]
    .map(([key, groupedReferences]) => {
      const [targetScope, targetIdentity] = key.split('\0');

      return {
        targetScope,
        targetIdentity,
        references: groupedReferences,
      };
    })
    .sort(compareUnresolvedTargetGroups);
}

export function createRelationshipNavigationTarget(
  index: PathDerivedEntityIndex,
  reference: SemanticReferenceViewModel,
  side: RelationshipNavigationSide,
): RelationshipNavigationTarget {
  if (side === 'target' && !reference.resolved) {
    return { status: 'unresolved_reference' };
  }

  const navigationEntity = side === 'source' ? reference.source : reference.target;

  if (!navigationEntity) {
    return { status: side === 'source' ? 'missing_source' : 'missing_target' };
  }

  const matchingEntity = findPathDerivedEntityForReferenceEntity(index, navigationEntity);

  if (!matchingEntity) {
    return { status: side === 'source' ? 'unmatched_source' : 'unmatched_target' };
  }

  return {
    status: 'matched_entity',
    entityKey: createPathDerivedEntityKey(matchingEntity),
  };
}

export function findPathDerivedEntityForReferenceEntity(
  index: PathDerivedEntityIndex,
  referenceEntity: SemanticReferenceEntity,
): PathDerivedModelEntity | undefined {
  return index.entities.find((entity) => isReferenceEntityMatch(referenceEntity, entity));
}

export function findUnresolvedReferencesForDiagnostic(
  diagnostic: { readonly filePath?: string; readonly fieldPath?: string },
  relationships: SelectedEntityRelationshipsViewModel | undefined,
): readonly SemanticReferenceViewModel[] {
  if (!relationships || !diagnostic.fieldPath) {
    return [];
  }

  const diagnosticFilePath = diagnostic.filePath
    ? normalizeWorkspacePath(diagnostic.filePath)
    : undefined;

  return relationships.unresolvedReferences.filter((reference) => {
    const sameField = reference.fieldPath === diagnostic.fieldPath;
    const sameSourceFile =
      !diagnosticFilePath ||
      (reference.source.filePath !== undefined &&
        normalizeWorkspacePath(reference.source.filePath) === diagnosticFilePath);

    return sameField && sameSourceFile;
  });
}

function isReferenceTargetMatch(
  reference: SemanticReferenceViewModel,
  entity: PathDerivedModelEntity,
): boolean {
  return reference.target
    ? isReferenceEntityMatch(reference.target, entity)
    : isReferenceTargetIdentityMatch(reference, entity);
}

function isReferenceTargetIdentityMatch(
  reference: Pick<SemanticReferenceViewModel, 'targetScope' | 'targetIdentity'>,
  entity: PathDerivedModelEntity,
): boolean {
  return reference.targetScope === entity.scope && reference.targetIdentity === entity.identity;
}

function isReferenceEntityMatch(
  referenceEntity: SemanticReferenceEntity,
  entity: PathDerivedModelEntity,
): boolean {
  if (referenceEntity.scope !== entity.scope || referenceEntity.identity !== entity.identity) {
    return false;
  }

  if (!referenceEntity.filePath) {
    return true;
  }

  return normalizeWorkspacePath(referenceEntity.filePath) === normalizeWorkspacePath(entity.filePath);
}

function createTargetKey(targetScope: string, targetIdentity: string): string {
  return `${targetScope}\0${targetIdentity}`;
}

function compareUnresolvedTargetGroups(
  left: UnresolvedReferenceTargetGroup,
  right: UnresolvedReferenceTargetGroup,
): number {
  return (
    left.targetScope.localeCompare(right.targetScope) ||
    left.targetIdentity.localeCompare(right.targetIdentity)
  );
}
