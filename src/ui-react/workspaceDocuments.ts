import type { PathDerivedEntityKey } from '../core';

export type EntityWorkspaceDocumentView = 'source' | 'relationships' | 'diagram';
export type WorkspaceDocumentId = 'overview' | `entity:${string}:${string}`;

export interface OverviewWorkspaceDocument {
  readonly kind: 'overview';
  readonly id: 'overview';
}

export interface EntityWorkspaceDocument extends PathDerivedEntityKey {
  readonly kind: 'entity';
  readonly id: WorkspaceDocumentId;
  readonly activeView: EntityWorkspaceDocumentView;
}

export type WorkspaceDocument = OverviewWorkspaceDocument | EntityWorkspaceDocument;

export interface WorkspaceDocumentState {
  readonly documents: readonly WorkspaceDocument[];
  readonly activeDocumentId: WorkspaceDocumentId;
}

export const OVERVIEW_WORKSPACE_DOCUMENT: OverviewWorkspaceDocument = {
  kind: 'overview',
  id: 'overview',
};

export function createInitialWorkspaceDocumentState(): WorkspaceDocumentState {
  return {
    documents: [OVERVIEW_WORKSPACE_DOCUMENT],
    activeDocumentId: OVERVIEW_WORKSPACE_DOCUMENT.id,
  };
}

export function createEntityWorkspaceDocumentId(
  entity: PathDerivedEntityKey,
): WorkspaceDocumentId {
  return `entity:${entity.scope}:${entity.identity}`;
}

export function createEntityWorkspaceDocument(
  entity: PathDerivedEntityKey,
  activeView: EntityWorkspaceDocumentView = 'source',
): EntityWorkspaceDocument {
  return {
    kind: 'entity',
    id: createEntityWorkspaceDocumentId(entity),
    scope: entity.scope,
    identity: entity.identity,
    activeView,
  };
}

export function openEntityWorkspaceDocument(
  state: WorkspaceDocumentState,
  entity: PathDerivedEntityKey,
  activeView: EntityWorkspaceDocumentView = 'source',
): WorkspaceDocumentState {
  const documentId = createEntityWorkspaceDocumentId(entity);
  const existingDocument = state.documents.find((document) => document.id === documentId);

  if (existingDocument) {
    return {
      documents: state.documents.map((document) =>
        document.id === documentId && document.kind === 'entity'
          ? { ...document, activeView }
          : document,
      ),
      activeDocumentId: documentId,
    };
  }

  return {
    documents: [...state.documents, createEntityWorkspaceDocument(entity, activeView)],
    activeDocumentId: documentId,
  };
}

export function activateWorkspaceDocument(
  state: WorkspaceDocumentState,
  documentId: WorkspaceDocumentId,
): WorkspaceDocumentState {
  const documentExists = state.documents.some((document) => document.id === documentId);

  if (!documentExists) {
    return state;
  }

  return {
    ...state,
    activeDocumentId: documentId,
  };
}

export function setActiveEntityWorkspaceDocumentView(
  state: WorkspaceDocumentState,
  activeView: EntityWorkspaceDocumentView,
): WorkspaceDocumentState {
  return {
    documents: state.documents.map((document) =>
      document.id === state.activeDocumentId && document.kind === 'entity'
        ? { ...document, activeView }
        : document,
    ),
    activeDocumentId: state.activeDocumentId,
  };
}

export function findActiveWorkspaceDocument(
  state: WorkspaceDocumentState,
): WorkspaceDocument {
  return (
    state.documents.find((document) => document.id === state.activeDocumentId) ??
    OVERVIEW_WORKSPACE_DOCUMENT
  );
}
