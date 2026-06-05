import { useEffect, useMemo, useState } from 'react';
import {
  canonicalExampleDefinitions,
  extractUploadedArchive,
  loadCanonicalExampleWorkspace,
  type CanonicalExampleId,
} from '../adapters/browser';
import { generateDiagramArtifactForEntity } from '../adapters/generator';
import { renderMermaidDiagram } from '../adapters/mermaid';
import { validateInMemoryModelWorkspace } from '../adapters/validator';
import {
  BEHAVIOML_MODEL_SCOPE_DIRECTORIES,
  createDiagnosticNavigationTarget,
  createPathDerivedEntityIndex,
  createRelationshipNavigationTarget,
  findUnresolvedReferencesForDiagnostic,
  createSelectedEntityRelationships,
  createGeneratingDiagramViewModel,
  createSourceFileView,
  createValidatedWorkspaceOverview,
  createWorkspaceOverview,
  findDiagnosticsForEntity,
  findSelectedEntity,
  searchWorkspace,
  type DiagnosticSelection,
  type DiagnosticViewModel,
  type PathDerivedEntityIndex,
  type PathDerivedEntitySelection,
  type PathDerivedModelEntity,
  type SearchResult,
  type SelectedEntityDiagramViewModel,
  type SelectedEntityRelationshipsViewModel,
  type RelationshipNavigationSide,
  type SemanticReferenceViewModel,
  type SourceFileViewModel,
  type ValidationResultViewModel,
  type WorkspaceFileEntry,
  type WorkspaceOverviewValidationStatus,
  type WorkspaceOverviewViewModel,
} from '../core';
import {
  activateWorkspaceDocument,
  createInitialWorkspaceDocumentState,
  findActiveWorkspaceDocument,
  openEntityWorkspaceDocument,
  setActiveEntityWorkspaceDocumentView,
  type EntityWorkspaceDocumentView,
  type WorkspaceDocument,
} from './workspaceDocuments';

type Status =
  | { readonly kind: 'idle'; readonly message: string }
  | { readonly kind: 'loading'; readonly message: string }
  | { readonly kind: 'validated'; readonly message: string; readonly validation: ValidationResultViewModel }
  | { readonly kind: 'error'; readonly message: string };

type ActivityMode = 'explorer' | 'search' | 'validation' | 'diagrams' | 'relationships';

const activityItems: readonly {
  readonly id: ActivityMode;
  readonly label: string;
  readonly shortLabel: string;
}[] = [
  { id: 'explorer', label: 'Explorer', shortLabel: 'Exp' },
  { id: 'search', label: 'Search', shortLabel: 'Find' },
  { id: 'validation', label: 'Validation', shortLabel: 'Val' },
  { id: 'diagrams', label: 'Diagrams', shortLabel: 'Dia' },
  { id: 'relationships', label: 'Relationships', shortLabel: 'Rel' },
];

export function App() {
  const [status, setStatus] = useState<Status>({
    kind: 'idle',
    message:
      'No workspace loaded. Choose a .tgz, .tar.gz, or .zip archive to validate it in memory.',
  });
  const [workspaceOverview, setWorkspaceOverview] = useState<WorkspaceOverviewViewModel>();
  const [workspaceFiles, setWorkspaceFiles] = useState<readonly WorkspaceFileEntry[]>([]);
  const [entityIndex, setEntityIndex] = useState<PathDerivedEntityIndex>();
  const [selectedEntity, setSelectedEntity] = useState<PathDerivedEntitySelection>();
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<DiagnosticSelection>();
  const [selectedSearchResult, setSelectedSearchResult] = useState<SearchResult>();
  const [searchText, setSearchText] = useState('');
  const [activeActivity, setActiveActivity] = useState<ActivityMode>('explorer');
  const [workspaceDocumentState, setWorkspaceDocumentState] = useState(createInitialWorkspaceDocumentState);
  const [diagramCache, setDiagramCache] = useState<Record<string, SelectedEntityDiagramViewModel>>({});

  async function handleArchiveSelected(file: File | undefined) {
    if (!file) {
      return;
    }

    await loadWorkspace(
      `Extracting ${file.name} in the browser...`,
      () => extractUploadedArchive({ kind: 'uploaded_archive', file }),
      'Unknown archive loading error.',
    );
  }

  async function handleExampleSelected(exampleId: CanonicalExampleId) {
    const example = canonicalExampleDefinitions.find((definition) => definition.id === exampleId);

    await loadWorkspace(
      `Fetching ${example?.label ?? exampleId} from BehavioML/specifications...`,
      () => loadCanonicalExampleWorkspace(exampleId),
      'Unknown example loading error.',
    );
  }

  async function loadWorkspace(
    loadingMessage: string,
    extractWorkspace: () => Promise<{
      readonly files: readonly WorkspaceFileEntry[];
      readonly sourceLabel: string;
      readonly modelRoot: string;
    }>,
    unknownErrorMessage: string,
  ) {
    setWorkspaceOverview(undefined);
    setWorkspaceFiles([]);
    setEntityIndex(undefined);
    setSelectedEntity(undefined);
    setSelectedDiagnostic(undefined);
    setSelectedSearchResult(undefined);
    setSearchText('');
    setActiveActivity('explorer');
    setWorkspaceDocumentState(createInitialWorkspaceDocumentState());
    setDiagramCache({});
    setStatus({ kind: 'loading', message: loadingMessage });

    try {
      const workspace = await extractWorkspace();
      setWorkspaceFiles(workspace.files);
      const nextEntityIndex = createPathDerivedEntityIndex(workspace.files);
      setEntityIndex(nextEntityIndex);
      setSelectedEntity(undefined);
      setWorkspaceOverview(
        createWorkspaceOverview({
          sourceLabel: workspace.sourceLabel,
          modelRoot: workspace.modelRoot,
          files: workspace.files,
          validationStatus: 'running',
        }),
      );
      setWorkspaceDocumentState(createInitialWorkspaceDocumentState());
      setStatus({
        kind: 'loading',
        message: `Validating ${workspace.files.length} extracted model file${workspace.files.length === 1 ? '' : 's'}...`,
      });

      const validationResult = await validateInMemoryModelWorkspace(workspace.files);

      if (validationResult.status === 'adapter_error') {
        setWorkspaceOverview(
          createWorkspaceOverview({
            sourceLabel: workspace.sourceLabel,
            modelRoot: workspace.modelRoot,
            files: workspace.files,
            validationStatus: 'validation_unavailable',
          }),
        );
        setStatus({ kind: 'error', message: validationResult.error.message });
        return;
      }

      setWorkspaceOverview(
        createValidatedWorkspaceOverview({
          sourceLabel: workspace.sourceLabel,
          modelRoot: workspace.modelRoot,
          files: workspace.files,
          validation: validationResult.validation,
        }),
      );
      setStatus({
        kind: 'validated',
        message: validationResult.validation.ok
          ? 'Validation completed without error diagnostics.'
          : 'Validation completed with diagnostics.',
        validation: validationResult.validation,
      });
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : unknownErrorMessage,
      });
    }
  }

  const validation = status.kind === 'validated' ? status.validation : undefined;
  const activeDocument = findActiveWorkspaceDocument(workspaceDocumentState);
  const activeEntitySelection = getActiveEntitySelection(activeDocument);
  const selected = entityIndex ? findSelectedEntity(entityIndex, activeEntitySelection) : undefined;
  const sourceView = selected ? createSourceFileView(workspaceFiles, selected) : undefined;
  const selectedRelationships = createSelectedEntityRelationships(validation?.referenceIndex, selected);
  const selectedDiagnostics = selected
    ? findDiagnosticsForEntity(validation?.diagnostics ?? [], selected)
    : [];
  const activeDiagramCacheKey =
    activeDocument.kind === 'entity' && activeDocument.activeView === 'diagram'
      ? createDiagramCacheKey(activeDocument)
      : undefined;
  const activeDiagramView = activeDiagramCacheKey ? diagramCache[activeDiagramCacheKey] : undefined;
  const displayedDiagramView =
    activeDocument.kind === 'entity' && activeDocument.activeView === 'diagram'
      ? activeDiagramView ?? createGeneratingDiagramViewModel(selected)
      : undefined;
  const searchResults = useMemo(
    () =>
      entityIndex
        ? searchWorkspace({ query: searchText, files: workspaceFiles, entityIndex })
        : ([] as readonly SearchResult[]),
    [entityIndex, searchText, workspaceFiles],
  );

  useEffect(() => {
    if (
      activeDocument.kind !== 'entity' ||
      activeDocument.activeView !== 'diagram' ||
      !activeDiagramCacheKey ||
      diagramCache[activeDiagramCacheKey]
    ) {
      return;
    }

    let cancelled = false;
    void generateDiagramArtifactForEntity(workspaceFiles, selected)
      .then((diagramView) => renderSelectedDiagramView(diagramView, activeDiagramCacheKey))
      .then((diagramView) => {
        if (cancelled) {
          return;
        }

        setDiagramCache((cache) => ({
          ...cache,
          [activeDiagramCacheKey]: diagramView,
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [activeDocument, activeDiagramCacheKey, diagramCache, selected, workspaceFiles]);

  function handleEntitySelected(selection: PathDerivedEntitySelection) {
    if (!selection) {
      return;
    }

    setSelectedEntity(selection);
    setSelectedDiagnostic(undefined);
    setSelectedSearchResult(undefined);
    setActiveActivity('explorer');
    setWorkspaceDocumentState((state) => openEntityWorkspaceDocument(state, selection, 'source'));
  }

  function handleDiagnosticSelected(diagnostic: DiagnosticViewModel) {
    if (!entityIndex || !diagnostic.filePath) {
      return;
    }

    const navigationTarget = createDiagnosticNavigationTarget(entityIndex, diagnostic);
    setSelectedDiagnostic(navigationTarget);
    setSelectedSearchResult(undefined);

    if (navigationTarget.entityKey) {
      const entityKey = navigationTarget.entityKey;
      setSelectedEntity(entityKey);
      setWorkspaceDocumentState((state) => openEntityWorkspaceDocument(state, entityKey, 'source'));
    }
  }

  function handleSearchQueryChanged(query: string) {
    setSearchText(query);
    setSelectedSearchResult(undefined);
    if (query.trim().length > 0) {
      setActiveActivity('search');
    }
  }

  function handleRelationshipTargetSelected(
    reference: SemanticReferenceViewModel,
    side: RelationshipNavigationSide,
  ) {
    if (!entityIndex) {
      return;
    }

    const navigationTarget = createRelationshipNavigationTarget(entityIndex, reference, side);

    if (navigationTarget.status === 'matched_entity') {
      setSelectedEntity(navigationTarget.entityKey);
      setSelectedDiagnostic(undefined);
      setSelectedSearchResult(undefined);
      setActiveActivity('relationships');
      setWorkspaceDocumentState((state) => openEntityWorkspaceDocument(state, navigationTarget.entityKey, 'source'));
    }
  }

  function handleSearchResultSelected(result: SearchResult) {
    setSelectedSearchResult(result.kind === 'source_match' ? result : undefined);
    setSelectedDiagnostic(undefined);

    if (result.entityKey) {
      const entityKey = result.entityKey;
      setSelectedEntity(entityKey);
      setWorkspaceDocumentState((state) => openEntityWorkspaceDocument(state, entityKey, 'source'));
    }
  }

  function handleWorkspaceDocumentSelected(document: WorkspaceDocument) {
    setWorkspaceDocumentState((state) => activateWorkspaceDocument(state, document.id));

    if (document.kind === 'entity') {
      setSelectedEntity({ scope: document.scope, identity: document.identity });
      return;
    }

    setSelectedEntity(undefined);
    setSelectedDiagnostic(undefined);
    setSelectedSearchResult(undefined);
  }

  function handleEntityDocumentViewSelected(view: EntityWorkspaceDocumentView) {
    setWorkspaceDocumentState((state) => setActiveEntityWorkspaceDocumentView(state, view));
  }

  const layout = new URLSearchParams(window.location.search).get('layout');

  if (layout === 'classic') {
    return (
      <ClassicLayout
        entityIndex={entityIndex}
        searchResults={searchResults}
        searchText={searchText}
        selected={selected}
        selectedDiagnostic={selectedDiagnostic}
        selectedDiagnostics={selectedDiagnostics}
        selectedEntity={selectedEntity}
        selectedSearchResult={selectedSearchResult}
        sourceView={sourceView}
        status={status}
        validation={validation}
        workspaceFiles={workspaceFiles}
        workspaceOverview={workspaceOverview}
        onArchiveSelected={handleArchiveSelected}
        onExampleSelected={handleExampleSelected}
        onDiagnosticSelected={handleDiagnosticSelected}
        onEntitySelected={handleEntitySelected}
        onSearchQueryChanged={handleSearchQueryChanged}
        onSearchResultSelected={handleSearchResultSelected}
      />
    );
  }

  return (
    <main className="workbench-shell" aria-label="BehavioML Explorer workbench">
      <TopBar
        searchText={searchText}
        status={status}
        validation={validation}
        workspaceOverview={workspaceOverview}
        onArchiveSelected={handleArchiveSelected}
        onExampleSelected={handleExampleSelected}
        onSearchChange={handleSearchQueryChanged}
      />

      <div className="workbench-body">
        <ActivityBar activeActivity={activeActivity} onSelectActivity={setActiveActivity} />
        <ExplorerPanel
          activeActivity={activeActivity}
          index={entityIndex}
          relationships={selectedRelationships}
          searchResults={searchResults}
          searchText={searchText}
          selectedEntity={selectedEntity}
          selectedSearchResult={selectedSearchResult}
          validation={validation}
          workspaceOverview={workspaceOverview}
          onRelationshipTargetSelected={handleRelationshipTargetSelected}
          onSearchQueryChanged={handleSearchQueryChanged}
          onSearchResultSelected={handleSearchResultSelected}
          onSelectActivity={setActiveActivity}
          onSelectEntity={handleEntitySelected}
        />
        <WorkspaceTabs
          activeDocument={activeDocument}
          documents={workspaceDocumentState.documents}
          diagnostics={selectedDiagnostics}
          diagramView={displayedDiagramView}
          entity={selected}
          selectedDiagnostic={selectedDiagnostic}
          selectedSearchResult={selectedSearchResult}
          sourceView={sourceView}
          validation={validation}
          workspaceOverview={workspaceOverview}
          relationships={selectedRelationships}
          onRelationshipTargetSelected={handleRelationshipTargetSelected}
          onSelectActivity={setActiveActivity}
          onSelectDocument={handleWorkspaceDocumentSelected}
          onSelectEntityView={handleEntityDocumentViewSelected}
        />
        <InspectorPanel
          entity={selected}
          relationships={selectedRelationships}
          selectedDiagnostic={selectedDiagnostic}
          selectedDiagnostics={selectedDiagnostics}
          selectedSearchResult={selectedSearchResult}
          sourceView={sourceView}
          validation={validation}
        />
      </div>

      <DiagnosticsPanel
        relationships={selectedRelationships}
        selectedDiagnostic={selectedDiagnostic}
        status={status}
        validation={validation}
        onSelectDiagnostic={handleDiagnosticSelected}
      />
    </main>
  );
}

function TopBar({
  searchText,
  status,
  validation,
  workspaceOverview,
  onArchiveSelected,
  onExampleSelected,
  onSearchChange,
}: {
  readonly searchText: string;
  readonly status: Status;
  readonly validation: ValidationResultViewModel | undefined;
  readonly workspaceOverview: WorkspaceOverviewViewModel | undefined;
  readonly onArchiveSelected: (file: File | undefined) => void;
  readonly onExampleSelected: (exampleId: CanonicalExampleId) => void;
  readonly onSearchChange: (query: string) => void;
}) {
  return (
    <header className="top-bar">
      <div className="brand-lockup" aria-label="Application identity">
        <span className="app-icon" aria-hidden="true">
          B
        </span>
        <div>
          <strong>BehavioML Explorer</strong>
          <span>{workspaceOverview?.modelRoot ?? 'No workspace loaded'}</span>
        </div>
      </div>

      <div className="top-bar-status" aria-live="polite">
        <span className={`status-dot status-dot--${status.kind}`} aria-hidden="true" />
        <span>{formatTopBarStatus(status, validation)}</span>
      </div>

      <label className="top-search">
        <span className="visually-hidden">Search loaded workspace</span>
        <input
          type="search"
          value={searchText}
          placeholder="Search workspace..."
          disabled={!workspaceOverview}
          onChange={(event) => onSearchChange(event.currentTarget.value)}
        />
      </label>

      <div className="top-load-actions" aria-label="Workspace load actions">
        <label className="top-load-button">
          <span>{status.kind === 'loading' ? 'Loading...' : 'Load archive'}</span>
          <input
            type="file"
            accept=".tgz,.tar.gz,.zip,application/gzip,application/zip"
            disabled={status.kind === 'loading'}
            onChange={(event) => void onArchiveSelected(event.currentTarget.files?.[0])}
          />
        </label>
        <ExampleLoader disabled={status.kind === 'loading'} onExampleSelected={onExampleSelected} />
      </div>
    </header>
  );
}

function ExampleLoader({
  disabled,
  onExampleSelected,
}: {
  readonly disabled: boolean;
  readonly onExampleSelected: (exampleId: CanonicalExampleId) => void;
}) {
  const [selectedExampleId, setSelectedExampleId] = useState<CanonicalExampleId>(
    canonicalExampleDefinitions[0].id,
  );

  return (
    <form
      className="example-loader"
      aria-label="Load built-in BehavioML example"
      onSubmit={(event) => {
        event.preventDefault();
        onExampleSelected(selectedExampleId);
      }}
    >
      <label>
        <span className="visually-hidden">Built-in example</span>
        <select
          value={selectedExampleId}
          disabled={disabled}
          onChange={(event) => setSelectedExampleId(event.currentTarget.value as CanonicalExampleId)}
        >
          {canonicalExampleDefinitions.map((example) => (
            <option value={example.id} key={example.id}>
              {example.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={disabled}>
        Load example
      </button>
    </form>
  );
}

function ActivityBar({
  activeActivity,
  onSelectActivity,
}: {
  readonly activeActivity: ActivityMode;
  readonly onSelectActivity: (activity: ActivityMode) => void;
}) {
  return (
    <nav className="activity-bar" aria-label="Workbench activity bar">
      {activityItems.map((item) => (
        <button
          className={
            activeActivity === item.id ? 'activity-button activity-button--active' : 'activity-button'
          }
          type="button"
          aria-pressed={activeActivity === item.id}
          title={item.label}
          key={item.id}
          onClick={() => onSelectActivity(item.id)}
        >
          <span>{item.shortLabel}</span>
          <small>{item.label}</small>
        </button>
      ))}
    </nav>
  );
}

function ExplorerPanel({
  activeActivity,
  index,
  relationships,
  searchResults,
  searchText,
  selectedEntity,
  selectedSearchResult,
  validation,
  workspaceOverview,
  onRelationshipTargetSelected,
  onSearchQueryChanged,
  onSearchResultSelected,
  onSelectActivity,
  onSelectEntity,
}: {
  readonly activeActivity: ActivityMode;
  readonly index: PathDerivedEntityIndex | undefined;
  readonly relationships: SelectedEntityRelationshipsViewModel | undefined;
  readonly searchResults: readonly SearchResult[];
  readonly searchText: string;
  readonly selectedEntity: PathDerivedEntitySelection;
  readonly selectedSearchResult: SearchResult | undefined;
  readonly validation: ValidationResultViewModel | undefined;
  readonly workspaceOverview: WorkspaceOverviewViewModel | undefined;
  readonly onRelationshipTargetSelected: (
    reference: SemanticReferenceViewModel,
    side: RelationshipNavigationSide,
  ) => void;
  readonly onSearchQueryChanged: (query: string) => void;
  readonly onSearchResultSelected: (result: SearchResult) => void;
  readonly onSelectActivity: (activity: ActivityMode) => void;
  readonly onSelectEntity: (selection: PathDerivedEntitySelection) => void;
}) {
  return (
    <aside className="explorer-panel" aria-label="Explorer panel">
      <div className="panel-heading">
        <p className="eyebrow">{formatActivityTitle(activeActivity)}</p>
        <h2>{formatActivityTitle(activeActivity)}</h2>
      </div>

      {activeActivity === 'explorer' ? (
        <>
          <button className="overview-tree-button" type="button" onClick={() => onSelectActivity('explorer')}>
            <span>Overview</span>
            <small>Loaded workspace orientation</small>
          </button>
          {index ? (
            <EntityScopeList
              index={index}
              selectedEntity={selectedEntity}
              onSelectEntity={onSelectEntity}
            />
          ) : (
            <EmptyWorkbenchState workspaceOverview={workspaceOverview} />
          )}
        </>
      ) : null}

      {activeActivity === 'search' ? (
        index ? (
          <SearchPanel
            query={searchText}
            results={searchResults}
            selectedSearchResult={selectedSearchResult}
            onQueryChange={onSearchQueryChanged}
            onSelectResult={onSearchResultSelected}
          />
        ) : (
          <PlaceholderPanel title="Search" message="Load a workspace to search source text and path-derived model entities." />
        )
      ) : null}

      {activeActivity === 'validation' ? (
        <ValidationActivitySummary validation={validation} workspaceOverview={workspaceOverview} />
      ) : null}

      {activeActivity === 'diagrams' ? (
        <PlaceholderPanel
          title="Diagrams"
          message="Open a workflow entity tab and select Diagram to lazily request Generator-owned Mermaid artifacts, render them as SVG, and preserve source-map metadata for future navigation."
        />
      ) : null}

      {activeActivity === 'relationships' ? (
        <RelationshipsPanel
          relationships={relationships}
          onSelectTarget={onRelationshipTargetSelected}
        />
      ) : null}
    </aside>
  );
}

function WorkspaceTabs({
  activeDocument,
  diagnostics,
  diagramView,
  documents,
  entity,
  relationships,
  selectedDiagnostic,
  selectedSearchResult,
  sourceView,
  validation,
  workspaceOverview,
  onRelationshipTargetSelected,
  onSelectActivity,
  onSelectDocument,
  onSelectEntityView,
}: {
  readonly activeDocument: WorkspaceDocument;
  readonly diagnostics: readonly DiagnosticViewModel[];
  readonly diagramView: SelectedEntityDiagramViewModel | undefined;
  readonly documents: readonly WorkspaceDocument[];
  readonly entity: PathDerivedModelEntity | undefined;
  readonly relationships: SelectedEntityRelationshipsViewModel | undefined;
  readonly selectedDiagnostic: DiagnosticSelection | undefined;
  readonly selectedSearchResult: SearchResult | undefined;
  readonly sourceView: SourceFileViewModel | undefined;
  readonly validation: ValidationResultViewModel | undefined;
  readonly workspaceOverview: WorkspaceOverviewViewModel | undefined;
  readonly onRelationshipTargetSelected: (
    reference: SemanticReferenceViewModel,
    side: RelationshipNavigationSide,
  ) => void;
  readonly onSelectActivity: (activity: ActivityMode) => void;
  readonly onSelectDocument: (document: WorkspaceDocument) => void;
  readonly onSelectEntityView: (view: EntityWorkspaceDocumentView) => void;
}) {
  return (
    <section className="workspace-area" aria-label="Workspace tabs and content">
      <div className="workspace-tab-strip" role="tablist" aria-label="Workspace documents">
        {documents.map((document) => (
          <button
            className={
              activeDocument.id === document.id ? 'workspace-tab workspace-tab--active' : 'workspace-tab'
            }
            type="button"
            role="tab"
            aria-selected={activeDocument.id === document.id}
            title={formatWorkspaceDocumentTitle(document)}
            key={document.id}
            onClick={() => onSelectDocument(document)}
          >
            <span>{formatWorkspaceDocumentLabel(document, entity)}</span>
          </button>
        ))}
      </div>

      <div className="workspace-content">
        {activeDocument.kind === 'overview' ? (
          <WorkspaceOverviewPanel
            overview={workspaceOverview}
            validation={validation}
            onOpenDiagnostics={() => onSelectActivity('validation')}
            onOpenExplorer={() => onSelectActivity('explorer')}
            onOpenDiagrams={() => onSelectActivity('diagrams')}
          />
        ) : null}
        {activeDocument.kind === 'entity' ? (
          <EntityDocumentWorkspace
            activeView={activeDocument.activeView}
            diagnostics={diagnostics}
            diagramView={diagramView}
            entity={entity}
            relationships={relationships}
            selectedDiagnostic={selectedDiagnostic}
            selectedSearchResult={selectedSearchResult}
            sourceView={sourceView}
            onRelationshipTargetSelected={onRelationshipTargetSelected}
            onSelectView={onSelectEntityView}
          />
        ) : null}
      </div>
    </section>
  );
}

function EntityDocumentWorkspace({
  activeView,
  diagnostics,
  diagramView,
  entity,
  relationships,
  selectedDiagnostic,
  selectedSearchResult,
  sourceView,
  onRelationshipTargetSelected,
  onSelectView,
}: {
  readonly activeView: EntityWorkspaceDocumentView;
  readonly diagnostics: readonly DiagnosticViewModel[];
  readonly diagramView: SelectedEntityDiagramViewModel | undefined;
  readonly entity: PathDerivedModelEntity | undefined;
  readonly relationships: SelectedEntityRelationshipsViewModel | undefined;
  readonly selectedDiagnostic: DiagnosticSelection | undefined;
  readonly selectedSearchResult: SearchResult | undefined;
  readonly sourceView: SourceFileViewModel | undefined;
  readonly onRelationshipTargetSelected: (
    reference: SemanticReferenceViewModel,
    side: RelationshipNavigationSide,
  ) => void;
  readonly onSelectView: (view: EntityWorkspaceDocumentView) => void;
}) {
  const viewTabs: readonly { readonly id: EntityWorkspaceDocumentView; readonly label: string }[] = [
    { id: 'source', label: 'Source' },
    { id: 'relationships', label: 'Relationships' },
    { id: 'diagram', label: 'Diagram' },
  ];

  return (
    <div className="entity-document-workspace">
      <div className="entity-view-tab-strip" role="tablist" aria-label="Entity document views">
        {viewTabs.map((view) => (
          <button
            className={
              activeView === view.id ? 'entity-view-tab entity-view-tab--active' : 'entity-view-tab'
            }
            type="button"
            role="tab"
            aria-selected={activeView === view.id}
            key={view.id}
            onClick={() => onSelectView(view.id)}
          >
            {view.label}
          </button>
        ))}
      </div>
      <div className="entity-document-content">
        {activeView === 'source' ? (
          <SourcePanel
            diagnostics={diagnostics}
            entity={entity}
            relationships={relationships}
            selectedDiagnostic={selectedDiagnostic}
            selectedSearchResult={selectedSearchResult}
            sourceView={sourceView}
          />
        ) : null}
        {activeView === 'relationships' ? (
          <RelationshipsPanel
            relationships={relationships}
            onSelectTarget={onRelationshipTargetSelected}
          />
        ) : null}
        {activeView === 'diagram' ? <DiagramView diagramView={diagramView} entity={entity} /> : null}
      </div>
    </div>
  );
}

function formatWorkspaceDocumentLabel(
  document: WorkspaceDocument,
  activeEntity: PathDerivedModelEntity | undefined,
): string {
  if (document.kind === 'overview') {
    return 'Overview';
  }

  if (
    activeEntity &&
    activeEntity.scope === document.scope &&
    activeEntity.identity === document.identity
  ) {
    return activeEntity.displayName;
  }

  return document.identity.split('/').at(-1) ?? document.identity;
}

function formatWorkspaceDocumentTitle(document: WorkspaceDocument): string {
  if (document.kind === 'overview') {
    return 'Workspace overview';
  }

  return `${document.scope}:${document.identity}`;
}

function getActiveEntitySelection(document: WorkspaceDocument): PathDerivedEntitySelection {
  if (document.kind !== 'entity') {
    return undefined;
  }

  return { scope: document.scope, identity: document.identity };
}

function WorkspaceOverviewPanel({
  overview,
  validation,
  onOpenDiagnostics,
  onOpenExplorer,
  onOpenDiagrams,
}: {
  readonly overview: WorkspaceOverviewViewModel | undefined;
  readonly validation: ValidationResultViewModel | undefined;
  readonly onOpenDiagnostics: () => void;
  readonly onOpenExplorer: () => void;
  readonly onOpenDiagrams: () => void;
}) {
  if (!overview) {
    return (
      <section className="overview-workspace-empty" aria-labelledby="empty-overview-title">
        <p className="eyebrow">Overview</p>
        <h2 id="empty-overview-title">Load a BehavioML workspace</h2>
        <p>
          Choose an uploaded archive from the top bar to establish the workspace context. The
          workbench will then open this overview with root, scope, and validation health.
        </p>
      </section>
    );
  }

  return (
    <section className="overview-workspace" aria-labelledby="workspace-overview-title">
      <div className="workspace-title-row">
        <div>
          <p className="eyebrow">Overview</p>
          <h2 id="workspace-overview-title">Workspace overview</h2>
        </div>
        <span className="health-pill">{formatValidationStatus(overview.validationStatus)}</span>
      </div>

      <dl className="workspace-summary compact-summary" aria-label="Loaded workspace overview">
        <div>
          <dt>Source</dt>
          <dd>{overview.sourceLabel}</dd>
        </div>
        <div>
          <dt>Model root</dt>
          <dd>{overview.modelRoot}</dd>
        </div>
        <div>
          <dt>Validation files</dt>
          <dd>{overview.validationFileCount}</dd>
        </div>
        <div>
          <dt>Diagnostics</dt>
          <dd>{formatDiagnosticSummary(overview)}</dd>
        </div>
      </dl>

      <div className="overview-actions" aria-label="Overview entry points">
        <button type="button" onClick={onOpenExplorer}>
          Browse entities
        </button>
        <button type="button" onClick={onOpenDiagnostics}>
          Review diagnostics
        </button>
        <button type="button" onClick={onOpenDiagrams}>
          Open diagrams
        </button>
      </div>

      <h3>Scope counts</h3>
      <ScopeCountList overview={overview} />

      <p className="overview-note">
        Scope counts and entities are path-derived from extracted workspace files. Source remains the
        authority in this UI; Validator output remains the authority for BehavioML semantics.
      </p>
      {!validation ? <p className="overview-note">Validation is not available until the adapter completes successfully.</p> : null}
    </section>
  );
}

function DiagramView({
  diagramView,
  entity,
}: {
  readonly diagramView: SelectedEntityDiagramViewModel | undefined;
  readonly entity: PathDerivedModelEntity | undefined;
}) {
  const view = diagramView ?? createGeneratingDiagramViewModel(entity);
  const artifact = view.artifact;

  return (
    <section className="diagram-placeholder" aria-labelledby="diagram-view-title">
      <div className="diagram-title-row">
        <div>
          <p className="eyebrow">Generator diagram</p>
          <h2 id="diagram-view-title">{view.title}</h2>
        </div>
        {entity ? <span>{entity.scope}</span> : null}
      </div>

      <div className="diagram-artifact-panel" aria-live="polite">
        <p className={`diagram-status diagram-status--${view.status}`}>{view.message}</p>
        {artifact ? (
          <dl className="diagram-artifact-metadata" aria-label="Generated artifact metadata">
            <div>
              <dt>Kind</dt>
              <dd>{artifact.kind}</dd>
            </div>
            <div>
              <dt>Format</dt>
              <dd>{artifact.format}</dd>
            </div>
            <div>
              <dt>Path</dt>
              <dd>{artifact.path || 'Generator did not provide a path'}</dd>
            </div>
          </dl>
        ) : null}
        <DiagramDiagnostics diagnostics={view.diagnostics} />
        {view.renderError ? (
          <div className="diagram-render-error" role="alert">
            <strong>Mermaid render error</strong>
            <p>{view.renderError.message}</p>
          </div>
        ) : null}
        {view.renderedSvg ? <RenderedDiagramSvg svg={view.renderedSvg} /> : null}
        {artifact?.sourceMap !== undefined ? <DiagramSourceMapMetadata sourceMap={artifact.sourceMap} /> : null}
        {artifact?.content ? (
          <details className="diagram-source-fallback" open={!view.renderedSvg}>
            <summary>Mermaid source fallback</summary>
            <pre className="diagram-source" aria-label="Generated Mermaid source"><code>{artifact.content}</code></pre>
          </details>
        ) : null}
      </div>
    </section>
  );
}

function RenderedDiagramSvg({ svg }: { readonly svg: string }) {
  return (
    <div
      className="diagram-svg-canvas"
      aria-label="Rendered Mermaid diagram"
      // Mermaid is initialized with securityLevel: 'strict' and htmlLabels: false in
      // src/adapters/mermaid, so this isolated injection displays renderer-owned SVG
      // without enabling arbitrary HTML labels from user-provided workspace content.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function DiagramSourceMapMetadata({ sourceMap }: { readonly sourceMap: unknown }) {
  return (
    <details className="diagram-source-map-metadata">
      <summary>{formatSourceMapSummary(sourceMap)}</summary>
      <pre>{formatSourceMapMetadata(sourceMap)}</pre>
    </details>
  );
}

function formatSourceMapSummary(sourceMap: unknown): string {
  if (Array.isArray(sourceMap)) {
    return `Source-map metadata (${sourceMap.length} entries)`;
  }

  return 'Source-map metadata';
}

function formatSourceMapMetadata(sourceMap: unknown): string {
  try {
    return JSON.stringify(sourceMap, null, 2) ?? String(sourceMap);
  } catch {
    return String(sourceMap);
  }
}

function DiagramDiagnostics({ diagnostics }: { readonly diagnostics: readonly DiagnosticViewModel[] }) {
  if (diagnostics.length === 0) {
    return null;
  }

  return (
    <div className="diagram-diagnostics" aria-label="Generator diagnostics">
      <h3>Generator diagnostics</h3>
      <ul>
        {diagnostics.map((diagnostic, index) => (
          <li key={`${diagnostic.severity}-${diagnostic.message}-${index}`}>
            <strong>{diagnostic.severity}</strong>: {diagnostic.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

async function renderSelectedDiagramView(
  diagramView: SelectedEntityDiagramViewModel,
  cacheKey: string,
): Promise<SelectedEntityDiagramViewModel> {
  const artifact = diagramView.artifact;

  if (!artifact?.content || artifact.format !== 'mermaid') {
    return diagramView;
  }

  const result = await renderMermaidDiagram(artifact.content, { diagramId: `behavioml-${cacheKey}` });

  if (result.status === 'render_error') {
    return {
      ...diagramView,
      renderError: { message: result.message },
    };
  }

  return {
    ...diagramView,
    renderedSvg: result.svg,
  };
}

function createDiagramCacheKey(entity: Pick<PathDerivedModelEntity, 'scope' | 'identity'>): string {
  return `${entity.scope}:${entity.identity}`;
}

function InspectorPanel({
  entity,
  relationships,
  selectedDiagnostic,
  selectedDiagnostics,
  selectedSearchResult,
  sourceView,
  validation,
}: {
  readonly entity: PathDerivedModelEntity | undefined;
  readonly relationships: SelectedEntityRelationshipsViewModel | undefined;
  readonly selectedDiagnostic: DiagnosticSelection | undefined;
  readonly selectedDiagnostics: readonly DiagnosticViewModel[];
  readonly selectedSearchResult: SearchResult | undefined;
  readonly sourceView: SourceFileViewModel | undefined;
  readonly validation: ValidationResultViewModel | undefined;
}) {
  return (
    <aside className="inspector-panel" aria-label="Inspector panel">
      <div className="panel-heading">
        <p className="eyebrow">Inspector</p>
        <h2>Selection</h2>
      </div>
      <SelectedEntitySummary entity={entity} diagnosticCount={selectedDiagnostics.length} />
      <SourceMetadata sourceView={sourceView} />
      <SelectedDiagnosticContext selection={selectedDiagnostic} relationships={relationships} />
      <SelectedSearchMatchContext result={selectedSearchResult} />
      <InspectorRelationships relationships={relationships} />
      <InspectorDiagnostics diagnostics={selectedDiagnostics} validation={validation} />
    </aside>
  );
}

function DiagnosticsPanel({
  relationships,
  selectedDiagnostic,
  status,
  validation,
  onSelectDiagnostic,
}: {
  readonly relationships: SelectedEntityRelationshipsViewModel | undefined;
  readonly selectedDiagnostic: DiagnosticSelection | undefined;
  readonly status: Status;
  readonly validation: ValidationResultViewModel | undefined;
  readonly onSelectDiagnostic: (diagnostic: DiagnosticViewModel) => void;
}) {
  const summary = validation ? summarizeDiagnosticSeverities(validation.diagnostics) : undefined;

  return (
    <section className="bottom-diagnostics" aria-label="Diagnostics panel">
      <div className="diagnostics-heading">
        <strong>Diagnostics</strong>
        {summary ? (
          <span>
            Errors {summary.errors} | Warnings {summary.warnings} | Info {summary.other}
          </span>
        ) : (
          <span>{status.message}</span>
        )}
      </div>
      {validation ? (
        <ValidationDiagnostics
          relationships={relationships}
          selectedDiagnostic={selectedDiagnostic}
          validation={validation}
          onSelectDiagnostic={onSelectDiagnostic}
        />
      ) : (
        <p className="empty-diagnostics">Diagnostics will appear here after validation completes.</p>
      )}
    </section>
  );
}

function ClassicLayout({
  entityIndex,
  searchResults,
  searchText,
  selected,
  selectedDiagnostic,
  selectedDiagnostics,
  selectedEntity,
  selectedSearchResult,
  sourceView,
  status,
  validation,
  workspaceOverview,
  onArchiveSelected,
  onExampleSelected,
  onDiagnosticSelected,
  onEntitySelected,
  onSearchQueryChanged,
  onSearchResultSelected,
}: {
  readonly entityIndex: PathDerivedEntityIndex | undefined;
  readonly searchResults: readonly SearchResult[];
  readonly searchText: string;
  readonly selected: PathDerivedModelEntity | undefined;
  readonly selectedDiagnostic: DiagnosticSelection | undefined;
  readonly selectedDiagnostics: readonly DiagnosticViewModel[];
  readonly selectedEntity: PathDerivedEntitySelection;
  readonly selectedSearchResult: SearchResult | undefined;
  readonly sourceView: SourceFileViewModel | undefined;
  readonly status: Status;
  readonly validation: ValidationResultViewModel | undefined;
  readonly workspaceFiles: readonly WorkspaceFileEntry[];
  readonly workspaceOverview: WorkspaceOverviewViewModel | undefined;
  readonly onArchiveSelected: (file: File | undefined) => void;
  readonly onExampleSelected: (exampleId: CanonicalExampleId) => void;
  readonly onDiagnosticSelected: (diagnostic: DiagnosticViewModel) => void;
  readonly onEntitySelected: (selection: PathDerivedEntitySelection) => void;
  readonly onSearchQueryChanged: (query: string) => void;
  readonly onSearchResultSelected: (result: SearchResult) => void;
}) {
  return (
    <main className="app-shell app-shell--classic">
      <section className="hero-panel" aria-labelledby="explorer-title">
        <p className="eyebrow">BehavioML</p>
        <h1 id="explorer-title">Model Explorer</h1>
        <p className="hero-copy">
          Classic stacked layout for archive loading, validation, path-derived entity browsing, and
          raw read-only source viewing.
        </p>
      </section>

      <section className="workspace-panel" aria-labelledby="workspace-loading-title">
        <div>
          <p className="eyebrow">Workspace</p>
          <h2 id="workspace-loading-title">Load a model archive</h2>
          <p>
            Upload a <code>.tgz</code>, <code>.tar.gz</code>, or <code>.zip</code> archive whose
            model root is either at the archive root, under <code>behavioml/</code>, or under{' '}
            <code>behavioml/model/</code>. Remote URL loading remains deferred.
          </p>
        </div>

        <div className="classic-load-actions">
          <label className="upload-placeholder">
            <span>Choose .tgz, .tar.gz, or .zip archive</span>
            <input
              type="file"
              accept=".tgz,.tar.gz,.zip,application/gzip,application/zip"
              disabled={status.kind === 'loading'}
              onChange={(event) => void onArchiveSelected(event.currentTarget.files?.[0])}
            />
          </label>
          <ExampleLoader disabled={status.kind === 'loading'} onExampleSelected={onExampleSelected} />
        </div>
      </section>

      {workspaceOverview ? <WorkspaceOverviewLegacy overview={workspaceOverview} /> : null}

      {entityIndex ? (
        <section className="entity-browser-panel" aria-labelledby="entity-browser-title">
          <div className="entity-browser-heading">
            <div>
              <p className="eyebrow">Entities</p>
              <h2 id="entity-browser-title">Path-derived entity browser</h2>
              <p>
                Entities below are inferred from workspace-relative paths under known BehavioML
                scope directories. Explorer does not parse YAML or JSON content for semantic fields.
              </p>
            </div>
            <strong className="entity-total">{entityIndex.totalEntities} total</strong>
          </div>

          {entityIndex.totalEntities > 0 ? (
            <div className="entity-browser-layout">
              <div className="entity-browser-sidebar">
                <SearchPanel
                  query={searchText}
                  results={searchResults}
                  selectedSearchResult={selectedSearchResult}
                  onQueryChange={onSearchQueryChanged}
                  onSelectResult={onSearchResultSelected}
                />
                <EntityScopeList
                  index={entityIndex}
                  selectedEntity={selectedEntity}
                  onSelectEntity={onEntitySelected}
                />
              </div>
              <div className="entity-detail-stack">
                <SelectedEntitySummary entity={selected} diagnosticCount={selectedDiagnostics.length} />
                <SelectedDiagnosticContext selection={selectedDiagnostic} />
                <SourcePanel
                  diagnostics={selectedDiagnostics}
                  entity={selected}
                  selectedDiagnostic={selectedDiagnostic}
                  selectedSearchResult={selectedSearchResult}
                  sourceView={sourceView}
                />
              </div>
            </div>
          ) : (
            <div className="entity-detail-stack">
              <SearchPanel
                query={searchText}
                results={searchResults}
                selectedSearchResult={selectedSearchResult}
                onQueryChange={onSearchQueryChanged}
                onSelectResult={onSearchResultSelected}
              />
              <p className="empty-entities">
                No path-derived model entities were found in known BehavioML scope directories.
              </p>
              <SelectedSearchMatchContext result={selectedSearchResult} />
              <SelectedDiagnosticContext selection={selectedDiagnostic} />
            </div>
          )}
        </section>
      ) : null}

      <section className="status-panel" aria-labelledby="validation-status-title">
        <p className="eyebrow">Validation</p>
        <h2 id="validation-status-title">Validation status</h2>
        <p className={`status-message status-message--${status.kind}`}>{status.message}</p>

        {validation ? (
          <ValidationDiagnostics
            selectedDiagnostic={selectedDiagnostic}
            validation={validation}
            onSelectDiagnostic={onDiagnosticSelected}
          />
        ) : null}
      </section>
    </main>
  );
}

function WorkspaceOverviewLegacy({ overview }: { readonly overview: WorkspaceOverviewViewModel }) {
  return (
    <section className="overview-panel" aria-labelledby="workspace-overview-title">
      <p className="eyebrow">Overview</p>
      <h2 id="workspace-overview-title">Workspace overview</h2>
      <p>
        Scope counts are derived from workspace-relative file paths only. The Validator remains the
        authority for BehavioML model semantics.
      </p>

      <dl className="workspace-summary" aria-label="Loaded workspace overview">
        <div>
          <dt>Source</dt>
          <dd>{overview.sourceLabel}</dd>
        </div>
        <div>
          <dt>Model root</dt>
          <dd>{overview.modelRoot}</dd>
        </div>
        <div>
          <dt>Validation files</dt>
          <dd>{overview.validationFileCount}</dd>
        </div>
        <div>
          <dt>Validation</dt>
          <dd>{formatValidationStatus(overview.validationStatus)}</dd>
        </div>
        <div>
          <dt>Diagnostics</dt>
          <dd>{formatDiagnosticSummary(overview)}</dd>
        </div>
      </dl>

      <h3>Scope counts</h3>
      <ScopeCountList overview={overview} />
    </section>
  );
}

function ScopeCountList({ overview }: { readonly overview: WorkspaceOverviewViewModel }) {
  return (
    <ul className="scope-count-list" aria-label="Path-based BehavioML scope counts">
      {BEHAVIOML_MODEL_SCOPE_DIRECTORIES.map((scope) => (
        <li key={scope}>
          <span>{scope}</span>
          <strong>{overview.scopeCounts[scope]}</strong>
        </li>
      ))}
    </ul>
  );
}

function EntityScopeList({
  index,
  selectedEntity,
  onSelectEntity,
}: {
  readonly index: PathDerivedEntityIndex;
  readonly selectedEntity: PathDerivedEntitySelection;
  readonly onSelectEntity: (selection: PathDerivedEntitySelection) => void;
}) {
  return (
    <div className="entity-scope-list" aria-label="Path-derived entities grouped by scope">
      {index.scopes.map((scopeGroup) => (
        <section className="entity-scope-group" key={scopeGroup.scope}>
          <h3>
            <span>{scopeGroup.scope}</span>
            <strong>{scopeGroup.entities.length}</strong>
          </h3>

          {scopeGroup.entities.length > 0 ? (
            <ul>
              {scopeGroup.entities.map((entity) => {
                const isSelected =
                  selectedEntity?.scope === entity.scope && selectedEntity.identity === entity.identity;

                return (
                  <li key={`${entity.scope}:${entity.identity}`}>
                    <button
                      className={isSelected ? 'entity-button entity-button--selected' : 'entity-button'}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => onSelectEntity({ scope: entity.scope, identity: entity.identity })}
                    >
                      <span>{entity.displayName}</span>
                      <code>{entity.identity}</code>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>No entities in this scope.</p>
          )}
        </section>
      ))}
    </div>
  );
}

function SearchPanel({
  query,
  results,
  selectedSearchResult,
  onQueryChange,
  onSelectResult,
}: {
  readonly query: string;
  readonly results: readonly SearchResult[];
  readonly selectedSearchResult: SearchResult | undefined;
  readonly onQueryChange: (query: string) => void;
  readonly onSelectResult: (result: SearchResult) => void;
}) {
  const trimmedQuery = query.trim();

  return (
    <section className="search-panel" aria-labelledby="local-search-title">
      <div>
        <h3 id="local-search-title">Local search</h3>
        <p>
          Search entity identity, scope, display name, file path, and raw source text. YAML and JSON
          are treated as plain text.
        </p>
      </div>
      <label className="search-input-label">
        <span>Search loaded workspace</span>
        <input
          type="search"
          value={query}
          placeholder="Type text or a path fragment..."
          onChange={(event) => onQueryChange(event.currentTarget.value)}
        />
      </label>

      {trimmedQuery.length > 0 ? (
        <div className="search-results" aria-live="polite">
          <p className="search-result-count">
            {results.length} result{results.length === 1 ? '' : 's'}
            {results.length >= 100 ? ' shown' : ''}
          </p>
          {results.length > 0 ? (
            <ul>
              {results.map((result, index) => {
                const resultKey = formatSearchResultKey(result, index);
                const isSelected = selectedSearchResult === result;

                return (
                  <li key={resultKey}>
                    <button
                      className={
                        isSelected
                          ? 'search-result-button search-result-button--selected'
                          : 'search-result-button'
                      }
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => onSelectResult(result)}
                    >
                      <span className="search-result-kind">
                        {result.kind === 'entity' ? 'Entity' : 'Source'}
                      </span>
                      <strong>{result.label}</strong>
                      {result.filePath ? <code>{result.filePath}</code> : null}
                      {result.kind === 'source_match' && result.lineNumber ? (
                        <span className="search-result-line">Line {result.lineNumber}</span>
                      ) : null}
                      <span className="search-result-match">{result.matchText}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="empty-search-results">No local text/path matches found.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}

function SelectedEntitySummary({
  entity,
  diagnosticCount,
}: {
  readonly entity: PathDerivedModelEntity | undefined;
  readonly diagnosticCount: number;
}) {
  if (!entity) {
    return (
      <section className="entity-summary" aria-label="Selected entity summary">
        <p className="empty-entities">Select an entity to see its path-derived summary.</p>
      </section>
    );
  }

  return (
    <section className="entity-summary" aria-label="Selected entity summary">
      <p className="eyebrow">Selected entity</p>
      <h3>{entity.displayName}</h3>
      <dl className="entity-summary-list">
        <div>
          <dt>Scope</dt>
          <dd>{entity.scope}</dd>
        </div>
        <div>
          <dt>Identity</dt>
          <dd>{entity.identity}</dd>
        </div>
        <div>
          <dt>File path</dt>
          <dd>
            <code>{entity.filePath}</code>
          </dd>
        </div>
        <div>
          <dt>Extension</dt>
          <dd>{entity.extension}</dd>
        </div>
        <div>
          <dt>Diagnostics for file</dt>
          <dd>{diagnosticCount}</dd>
        </div>
      </dl>
    </section>
  );
}

function SourcePanel({
  diagnostics,
  entity,
  selectedDiagnostic,
  selectedSearchResult,
  sourceView,
}: {
  readonly diagnostics: readonly DiagnosticViewModel[];
  readonly entity: PathDerivedModelEntity | undefined;
  readonly relationships?: SelectedEntityRelationshipsViewModel | undefined;
  readonly selectedDiagnostic: DiagnosticSelection | undefined;
  readonly selectedSearchResult: SearchResult | undefined;
  readonly sourceView: SourceFileViewModel | undefined;
}) {
  if (!entity) {
    return (
      <section className="source-panel" aria-labelledby="source-panel-title">
        <p className="eyebrow">Source</p>
        <h2 id="source-panel-title">Source</h2>
        <p className="missing-source">Select an entity in the Explorer tree to inspect its raw source.</p>
      </section>
    );
  }

  if (!sourceView) {
    return (
      <section className="source-panel" aria-labelledby="source-panel-title">
        <p className="eyebrow">Source</p>
        <h2 id="source-panel-title">Source</h2>
        <p className="missing-source">
          Source file <code>{entity.filePath}</code> is not available in the extracted workspace.
        </p>
        <SelectedSearchMatchContext result={selectedSearchResult} />
        <SelectedDiagnosticContext selection={selectedDiagnostic} />
      </section>
    );
  }

  return (
    <section className="source-panel" aria-labelledby="source-panel-title">
      <div className="source-header-row">
        <div>
          <p className="eyebrow">Source</p>
          <h2 id="source-panel-title">{sourceView.filePath}</h2>
        </div>
        <span>{sourceView.lineCount} lines</span>
      </div>

      <SelectedSearchMatchContext result={selectedSearchResult} />
      <SelectedDiagnosticContext selection={selectedDiagnostic} />
      <SelectedSourceDiagnostics diagnostics={diagnostics} />

      <pre className="source-code"><code>{sourceView.content}</code></pre>
    </section>
  );
}

function SourceMetadata({ sourceView }: { readonly sourceView: SourceFileViewModel | undefined }) {
  if (!sourceView) {
    return null;
  }

  return (
    <section className="source-metadata" aria-label="Selected source metadata">
      <h3>Source file</h3>
      <dl className="source-metadata-list">
        <div>
          <dt>File path</dt>
          <dd>
            <code>{sourceView.filePath}</code>
          </dd>
        </div>
        <div>
          <dt>Extension</dt>
          <dd>{sourceView.extension}</dd>
        </div>
        <div>
          <dt>Line count</dt>
          <dd>{sourceView.lineCount}</dd>
        </div>
        <div>
          <dt>Characters</dt>
          <dd>{sourceView.characterCount}</dd>
        </div>
      </dl>
    </section>
  );
}

function SelectedSearchMatchContext({ result }: { readonly result: SearchResult | undefined }) {
  if (!result || result.kind !== 'source_match') {
    return null;
  }

  return (
    <aside className="selected-search-context" aria-label="Selected search match context">
      <h4>Selected search match</h4>
      {!result.entityKey ? (
        <p className="search-navigation-note">
          This source match is in an extracted workspace file that is not part of the path-derived
          entity index. The current entity selection is unchanged.
        </p>
      ) : null}
      <dl className="selected-search-list">
        <div>
          <dt>File path</dt>
          <dd>{result.filePath ? <code>{result.filePath}</code> : 'No file path'}</dd>
        </div>
        <div>
          <dt>Line</dt>
          <dd>{result.lineNumber ?? 'Not available'}</dd>
        </div>
        <div>
          <dt>Line text</dt>
          <dd>{result.lineText ?? result.matchText}</dd>
        </div>
      </dl>
    </aside>
  );
}

function SelectedSourceDiagnostics({ diagnostics }: { readonly diagnostics: readonly DiagnosticViewModel[] }) {
  return (
    <div className="selected-source-diagnostics" aria-label="Diagnostics for selected source file">
      <h4>Diagnostics for this file</h4>
      {diagnostics.length > 0 ? (
        <ul className="diagnostic-list diagnostic-list--compact">
          {diagnostics.map((diagnostic, index) => (
            <DiagnosticItem diagnostic={diagnostic} key={`${diagnostic.filePath ?? 'source'}-${index}`} />
          ))}
        </ul>
      ) : (
        <p className="empty-diagnostics">No Validator diagnostics match this source file path.</p>
      )}
    </div>
  );
}

function SelectedDiagnosticContext({
  relationships,
  selection,
}: {
  readonly relationships?: SelectedEntityRelationshipsViewModel | undefined;
  readonly selection: DiagnosticSelection | undefined;
}) {
  if (!selection) {
    return null;
  }

  const { diagnostic } = selection;

  return (
    <aside className="selected-diagnostic-context" aria-label="Selected diagnostic context">
      <h4>Selected diagnostic</h4>
      {selection.status === 'unmatched_file_path' ? (
        <p className="diagnostic-navigation-note">
          This diagnostic file is not part of the path-derived entity index. The current entity
          selection is unchanged.
        </p>
      ) : null}
      <dl className="selected-diagnostic-list">
        <div>
          <dt>Severity</dt>
          <dd>
            <span className={`severity severity--${diagnostic.severity}`}>{diagnostic.severity}</span>
          </dd>
        </div>
        <div>
          <dt>Message</dt>
          <dd>{diagnostic.message}</dd>
        </div>
        <div>
          <dt>File path</dt>
          <dd>{diagnostic.filePath ? <code>{diagnostic.filePath}</code> : 'No file path reported'}</dd>
        </div>
        {diagnostic.fieldPath ? (
          <div>
            <dt>Field path</dt>
            <dd>
              <code>{diagnostic.fieldPath}</code>
            </dd>
          </div>
        ) : null}
      </dl>
      <DiagnosticRelationshipContext diagnostic={diagnostic} relationships={relationships} />
    </aside>
  );
}


function RelationshipsPanel({
  relationships,
  onSelectTarget,
}: {
  readonly relationships: SelectedEntityRelationshipsViewModel | undefined;
  readonly onSelectTarget: (reference: SemanticReferenceViewModel, side: RelationshipNavigationSide) => void;
}) {
  if (!relationships) {
    return (
      <PlaceholderPanel
        title="Relationships"
        message="Load a validated workspace and select an entity to inspect Validator-backed relationships."
      />
    );
  }

  return (
    <section className="relationships-panel" aria-label="Validator-backed relationships">
      <h3>{relationships.entity.displayName}</h3>
      <p>
        References and backlinks are provided by Validator's semantic reference index; Explorer does
        not infer them from source text.
      </p>
      <RelationshipReferenceList
        title="Outgoing references"
        emptyMessage="No outgoing semantic references for this entity."
        references={relationships.outgoingReferences}
        navigationSide="target"
        onSelectTarget={onSelectTarget}
      />
      <RelationshipReferenceList
        title="Incoming references / backlinks"
        emptyMessage="No incoming backlinks for this entity."
        references={relationships.incomingReferences}
        navigationSide="source"
        onSelectTarget={onSelectTarget}
      />
      <RelationshipReferenceList
        title="Unresolved references involving this entity"
        emptyMessage="No unresolved references involving this entity."
        references={relationships.unresolvedReferences}
        navigationSide="target"
        onSelectTarget={onSelectTarget}
      />
      {relationships.unresolvedReferencesByTarget.length > 0 ? (
        <div className="relationship-groups" aria-label="Unresolved references grouped by target">
          <h4>Unresolved by target</h4>
          <ul>
            {relationships.unresolvedReferencesByTarget.map((group) => (
              <li key={`${group.targetScope}:${group.targetIdentity}`}>
                <code>{group.targetScope}:{group.targetIdentity}</code>
                <span>{group.references.length} reference{group.references.length === 1 ? '' : 's'}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function RelationshipReferenceList({
  emptyMessage,
  navigationSide,
  references,
  title,
  onSelectTarget,
}: {
  readonly emptyMessage: string;
  readonly navigationSide: RelationshipNavigationSide;
  readonly references: readonly SemanticReferenceViewModel[];
  readonly title: string;
  readonly onSelectTarget: (reference: SemanticReferenceViewModel, side: RelationshipNavigationSide) => void;
}) {
  return (
    <section className="relationship-section" aria-label={title}>
      <h4>{title}</h4>
      {references.length > 0 ? (
        <ul className="relationship-list">
          {references.map((reference, index) => (
            <RelationshipReferenceRow
              navigationSide={navigationSide}
              reference={reference}
              key={`${reference.source.scope}:${reference.source.identity}:${reference.fieldPath}:${reference.targetScope}:${reference.targetIdentity}:${index}`}
              onSelectTarget={onSelectTarget}
            />
          ))}
        </ul>
      ) : (
        <p>{emptyMessage}</p>
      )}
    </section>
  );
}

function RelationshipReferenceRow({
  navigationSide,
  reference,
  onSelectTarget,
}: {
  readonly navigationSide: RelationshipNavigationSide;
  readonly reference: SemanticReferenceViewModel;
  readonly onSelectTarget: (reference: SemanticReferenceViewModel, side: RelationshipNavigationSide) => void;
}) {
  const targetFilePath = reference.target?.filePath;
  const isNavigable = navigationSide === 'source' || (reference.resolved && reference.target !== undefined);
  const navigationLabel = navigationSide === 'source' ? 'Navigate to source entity' : 'Navigate to target entity';
  const content = (
    <>
      <span className={`relationship-status relationship-status--${reference.resolved ? 'resolved' : 'unresolved'}`}>
        {reference.resolved ? 'resolved' : 'unresolved'}
      </span>
      <span>Source <code>{reference.source.scope}:{reference.source.identity}</code></span>
      <span>Field <code>{reference.fieldPath}</code></span>
      <span>Target <code>{reference.targetScope}:{reference.targetIdentity}</code></span>
      {targetFilePath ? <span>Target file <code>{targetFilePath}</code></span> : null}
    </>
  );

  return (
    <li>
      {isNavigable ? (
        <button
          aria-label={navigationLabel}
          className="relationship-row relationship-row--button"
          type="button"
          onClick={() => onSelectTarget(reference, navigationSide)}
        >
          {content}
        </button>
      ) : (
        <div className="relationship-row">{content}</div>
      )}
    </li>
  );
}

function InspectorRelationships({
  relationships,
}: {
  readonly relationships: SelectedEntityRelationshipsViewModel | undefined;
}) {
  if (!relationships) {
    return null;
  }

  return (
    <section className="inspector-relationships" aria-label="Relationship summary">
      <h3>Relationships</h3>
      <dl className="entity-summary-list">
        <div><dt>Outgoing</dt><dd>{relationships.outgoingReferences.length}</dd></div>
        <div><dt>Incoming backlinks</dt><dd>{relationships.incomingReferences.length}</dd></div>
        <div><dt>Unresolved</dt><dd>{relationships.unresolvedReferences.length}</dd></div>
      </dl>
    </section>
  );
}

function DiagnosticRelationshipContext({
  diagnostic,
  relationships,
}: {
  readonly diagnostic: DiagnosticViewModel;
  readonly relationships?: SelectedEntityRelationshipsViewModel | undefined;
}) {
  const relatedReferences = findUnresolvedReferencesForDiagnostic(diagnostic, relationships);

  if (relatedReferences.length === 0) {
    return null;
  }

  return (
    <div className="diagnostic-relationship-context" aria-label="Diagnostic relationship context">
      <h5>Relationship context</h5>
      <ul>
        {relatedReferences.map((reference, index) => (
          <li key={`${reference.source.scope}:${reference.source.identity}:${reference.fieldPath}:${index}`}>
            <code>{reference.fieldPath}</code> points to <code>{reference.targetScope}:{reference.targetIdentity}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}

function countDiagnosticRelationships(
  diagnostic: DiagnosticViewModel,
  relationships?: SelectedEntityRelationshipsViewModel | undefined,
): number {
  return findUnresolvedReferencesForDiagnostic(diagnostic, relationships).length;
}


function InspectorDiagnostics({
  diagnostics,
  validation,
}: {
  readonly diagnostics: readonly DiagnosticViewModel[];
  readonly validation: ValidationResultViewModel | undefined;
}) {
  return (
    <section className="inspector-diagnostics" aria-label="Inspector diagnostics summary">
      <h3>Diagnostics</h3>
      <p>{validation ? `${diagnostics.length} diagnostics for selected file.` : 'Validation not available.'}</p>
    </section>
  );
}

function ValidationDiagnostics({
  relationships,
  selectedDiagnostic,
  validation,
  onSelectDiagnostic,
}: {
  readonly relationships?: SelectedEntityRelationshipsViewModel | undefined;
  readonly selectedDiagnostic: DiagnosticSelection | undefined;
  readonly validation: ValidationResultViewModel;
  readonly onSelectDiagnostic: (diagnostic: DiagnosticViewModel) => void;
}) {
  return (
    <div className="diagnostics-panel">
      {validation.diagnostics.length > 0 ? (
        <ul className="diagnostic-list">
          {validation.diagnostics.map((diagnostic, index) => (
            <DiagnosticItem
              diagnostic={diagnostic}
              relationshipCount={countDiagnosticRelationships(diagnostic, relationships)}
              isSelected={selectedDiagnostic?.diagnostic === diagnostic}
              key={`${diagnostic.filePath ?? 'workspace'}-${index}`}
              onSelect={diagnostic.filePath ? () => onSelectDiagnostic(diagnostic) : undefined}
            />
          ))}
        </ul>
      ) : (
        <p className="empty-diagnostics">No diagnostics were reported by the Validator.</p>
      )}
    </div>
  );
}

function DiagnosticItem({
  diagnostic,
  relationshipCount = 0,
  isSelected = false,
  onSelect,
}: {
  readonly diagnostic: DiagnosticViewModel;
  readonly relationshipCount?: number;
  readonly isSelected?: boolean;
  readonly onSelect?: () => void;
}) {
  const content = (
    <>
      <span className={`severity severity--${diagnostic.severity}`}>{diagnostic.severity}</span>
      <span className="diagnostic-message">{diagnostic.message}</span>
      {diagnostic.filePath ? <code>{diagnostic.filePath}</code> : null}
      {diagnostic.fieldPath ? <code>{diagnostic.fieldPath}</code> : null}
      {relationshipCount > 0 ? <span>{relationshipCount} related unresolved reference{relationshipCount === 1 ? '' : 's'}</span> : null}
    </>
  );

  if (!onSelect) {
    return <li className="diagnostic-item">{content}</li>;
  }

  return (
    <li>
      <button
        className={
          isSelected
            ? 'diagnostic-item diagnostic-item--button diagnostic-item--selected'
            : 'diagnostic-item diagnostic-item--button'
        }
        type="button"
        aria-pressed={isSelected}
        onClick={onSelect}
      >
        {content}
      </button>
    </li>
  );
}

function ValidationActivitySummary({
  validation,
  workspaceOverview,
}: {
  readonly validation: ValidationResultViewModel | undefined;
  readonly workspaceOverview: WorkspaceOverviewViewModel | undefined;
}) {
  if (!workspaceOverview) {
    return <PlaceholderPanel title="Validation" message="Load a workspace to review Validator diagnostics." />;
  }

  return (
    <section className="activity-summary">
      <p>{formatValidationStatus(workspaceOverview.validationStatus)}</p>
      <p>{formatDiagnosticSummary(workspaceOverview)}</p>
      <p>
        {validation
          ? 'Use the bottom Problems-style panel to navigate diagnostics back to source context.'
          : 'Validation status will update when the adapter completes.'}
      </p>
    </section>
  );
}

function PlaceholderPanel({ title, message }: { readonly title: string; readonly message: string }) {
  return (
    <section className="placeholder-panel" aria-label={`${title} placeholder`}>
      <h3>{title}</h3>
      <p>{message}</p>
    </section>
  );
}

function EmptyWorkbenchState({
  workspaceOverview,
}: {
  readonly workspaceOverview: WorkspaceOverviewViewModel | undefined;
}) {
  return (
    <section className="placeholder-panel">
      <h3>{workspaceOverview ? 'No model entities' : 'No workspace loaded'}</h3>
      <p>
        {workspaceOverview
          ? 'No path-derived model entities were found in known BehavioML scope directories.'
          : 'Load an archive from the top bar to populate the workbench explorer.'}
      </p>
    </section>
  );
}

function formatSearchResultKey(result: SearchResult, fallbackIndex: number): string {
  return [
    result.kind,
    result.filePath ?? 'workspace',
    result.scope ?? '',
    result.identity ?? '',
    result.lineNumber ?? '',
    fallbackIndex,
  ].join(':');
}

function formatValidationStatus(status: WorkspaceOverviewValidationStatus): string {
  switch (status) {
    case 'not_run':
      return 'Not run';
    case 'running':
      return 'Running';
    case 'valid':
      return 'Valid';
    case 'has_diagnostics':
      return 'Has diagnostics';
    case 'validation_unavailable':
      return 'Validation unavailable';
  }
}

function formatTopBarStatus(
  status: Status,
  validation: ValidationResultViewModel | undefined,
): string {
  if (validation) {
    const summary = summarizeDiagnosticSeverities(validation.diagnostics);
    return validation.ok
      ? 'Health: 0 errors'
      : `Health: ${summary.errors} errors, ${summary.warnings} warnings`;
  }

  return status.message;
}

function formatActivityTitle(activity: ActivityMode): string {
  return activityItems.find((item) => item.id === activity)?.label ?? 'Explorer';
}

function formatDiagnosticSummary(overview: WorkspaceOverviewViewModel): string {
  return `${overview.diagnosticSummary.errors} error${overview.diagnosticSummary.errors === 1 ? '' : 's'}, ${overview.diagnosticSummary.warnings} warning${overview.diagnosticSummary.warnings === 1 ? '' : 's'}, ${overview.diagnosticSummary.other} info/other`;
}

function summarizeDiagnosticSeverities(diagnostics: readonly DiagnosticViewModel[]) {
  return diagnostics.reduce(
    (summary, diagnostic) => {
      const severity = diagnostic.severity.toLowerCase();

      if (severity === 'error') {
        return { ...summary, errors: summary.errors + 1 };
      }

      if (severity === 'warning' || severity === 'warn') {
        return { ...summary, warnings: summary.warnings + 1 };
      }

      return { ...summary, other: summary.other + 1 };
    },
    { errors: 0, warnings: 0, other: 0 },
  );
}
