import { useState } from 'react';
import { extractUploadedArchive } from '../adapters/browser';
import { validateInMemoryModelWorkspace } from '../adapters/validator';
import {
  BEHAVIOML_MODEL_SCOPE_DIRECTORIES,
  createDiagnosticNavigationTarget,
  createPathDerivedEntityIndex,
  createSourceFileView,
  createValidatedWorkspaceOverview,
  createWorkspaceOverview,
  findDiagnosticsForEntity,
  findSelectedEntity,
  getDefaultEntitySelection,
  type DiagnosticSelection,
  type DiagnosticViewModel,
  type PathDerivedEntityIndex,
  type PathDerivedEntitySelection,
  type PathDerivedModelEntity,
  type SourceFileViewModel,
  type ValidationResultViewModel,
  type WorkspaceFileEntry,
  type WorkspaceOverviewValidationStatus,
  type WorkspaceOverviewViewModel,
} from '../core';

type Status =
  | { readonly kind: 'idle'; readonly message: string }
  | { readonly kind: 'loading'; readonly message: string }
  | { readonly kind: 'validated'; readonly message: string; readonly validation: ValidationResultViewModel }
  | { readonly kind: 'error'; readonly message: string };

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

  async function handleArchiveSelected(file: File | undefined) {
    if (!file) {
      return;
    }

    setWorkspaceOverview(undefined);
    setWorkspaceFiles([]);
    setEntityIndex(undefined);
    setSelectedEntity(undefined);
    setSelectedDiagnostic(undefined);
    setStatus({ kind: 'loading', message: `Extracting ${file.name} in the browser...` });

    try {
      const workspace = await extractUploadedArchive({ kind: 'uploaded_archive', file });
      setWorkspaceFiles(workspace.files);
      const nextEntityIndex = createPathDerivedEntityIndex(workspace.files);
      setEntityIndex(nextEntityIndex);
      setSelectedEntity(getDefaultEntitySelection(nextEntityIndex));
      setWorkspaceOverview(
        createWorkspaceOverview({
          sourceLabel: workspace.sourceLabel,
          modelRoot: workspace.modelRoot,
          files: workspace.files,
          validationStatus: 'running',
        }),
      );
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
        message: error instanceof Error ? error.message : 'Unknown archive loading error.',
      });
    }
  }

  const validation = status.kind === 'validated' ? status.validation : undefined;

  function handleEntitySelected(selection: PathDerivedEntitySelection) {
    setSelectedEntity(selection);
    setSelectedDiagnostic(undefined);
  }

  function handleDiagnosticSelected(diagnostic: DiagnosticViewModel) {
    if (!entityIndex || !diagnostic.filePath) {
      return;
    }

    const navigationTarget = createDiagnosticNavigationTarget(entityIndex, diagnostic);
    setSelectedDiagnostic(navigationTarget);

    if (navigationTarget.entityKey) {
      setSelectedEntity(navigationTarget.entityKey);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero-panel" aria-labelledby="explorer-title">
        <p className="eyebrow">BehavioML</p>
        <h1 id="explorer-title">Model Explorer</h1>
        <p className="hero-copy">
          First read-only vertical slice for loading an uploaded BehavioML model archive, extracting
          it in the browser, validating the in-memory workspace, and showing a path-based workspace
          overview with Validator diagnostics.
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

        <label className="upload-placeholder">
          <span>Choose .tgz, .tar.gz, or .zip archive</span>
          <input
            type="file"
            accept=".tgz,.tar.gz,.zip,application/gzip,application/zip"
            disabled={status.kind === 'loading'}
            onChange={(event) => void handleArchiveSelected(event.currentTarget.files?.[0])}
          />
        </label>
      </section>

      {workspaceOverview ? <WorkspaceOverview overview={workspaceOverview} /> : null}

      {entityIndex ? (
        <EntityBrowser
          diagnostics={validation?.diagnostics ?? []}
          files={workspaceFiles}
          index={entityIndex}
          selectedDiagnostic={selectedDiagnostic}
          selectedEntity={selectedEntity}
          onSelectEntity={handleEntitySelected}
        />
      ) : null}

      <section className="status-panel" aria-labelledby="validation-status-title">
        <p className="eyebrow">Validation</p>
        <h2 id="validation-status-title">Validation status</h2>
        <p className={`status-message status-message--${status.kind}`}>{status.message}</p>

        {validation ? (
          <ValidationDiagnostics
            selectedDiagnostic={selectedDiagnostic}
            validation={validation}
            onSelectDiagnostic={handleDiagnosticSelected}
          />
        ) : null}

        <p className="status-note">
          Archive extraction lives under <code>src/adapters/browser</code>; Validator integration is
          isolated under <code>src/adapters/validator</code>. The React UI does not import the
          Validator package directly.
        </p>
      </section>
    </main>
  );
}

function WorkspaceOverview({ overview }: { readonly overview: WorkspaceOverviewViewModel }) {
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
          <dd>
            {overview.diagnosticSummary.errors} error
            {overview.diagnosticSummary.errors === 1 ? '' : 's'},{' '}
            {overview.diagnosticSummary.warnings} warning
            {overview.diagnosticSummary.warnings === 1 ? '' : 's'},{' '}
            {overview.diagnosticSummary.other} info/other
          </dd>
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

function EntityBrowser({
  diagnostics,
  files,
  index,
  selectedDiagnostic,
  selectedEntity,
  onSelectEntity,
}: {
  readonly diagnostics: readonly DiagnosticViewModel[];
  readonly files: readonly WorkspaceFileEntry[];
  readonly index: PathDerivedEntityIndex;
  readonly selectedDiagnostic: DiagnosticSelection | undefined;
  readonly selectedEntity: PathDerivedEntitySelection;
  readonly onSelectEntity: (selection: PathDerivedEntitySelection) => void;
}) {
  const selected = findSelectedEntity(index, selectedEntity);
  const sourceView = selected ? createSourceFileView(files, selected) : undefined;
  const selectedDiagnostics = selected ? findDiagnosticsForEntity(diagnostics, selected) : [];

  return (
    <section className="entity-browser-panel" aria-labelledby="entity-browser-title">
      <div className="entity-browser-heading">
        <div>
          <p className="eyebrow">Entities</p>
          <h2 id="entity-browser-title">Path-derived entity browser</h2>
          <p>
            Entities below are inferred from workspace-relative paths under known BehavioML scope
            directories. Explorer does not parse YAML or JSON content for semantic fields.
          </p>
        </div>
        <strong className="entity-total">{index.totalEntities} total</strong>
      </div>

      {index.totalEntities > 0 ? (
        <div className="entity-browser-layout">
          <EntityScopeList
            index={index}
            selectedEntity={selectedEntity}
            onSelectEntity={onSelectEntity}
          />
          <div className="entity-detail-stack">
            <SelectedEntitySummary entity={selected} diagnosticCount={selectedDiagnostics.length} />
            <SourcePanel
              diagnostics={selectedDiagnostics}
              entity={selected}
              selectedDiagnostic={selectedDiagnostic}
              sourceView={sourceView}
            />
          </div>
        </div>
      ) : (
        <div className="entity-detail-stack">
          <p className="empty-entities">
            No path-derived model entities were found in known BehavioML scope directories.
          </p>
          <SelectedDiagnosticContext selection={selectedDiagnostic} />
        </div>
      )}
    </section>
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
                  selectedEntity?.scope === entity.scope &&
                  selectedEntity.identity === entity.identity;

                return (
                  <li key={`${entity.scope}:${entity.identity}`}>
                    <button
                      className={
                        isSelected ? 'entity-button entity-button--selected' : 'entity-button'
                      }
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() =>
                        onSelectEntity({ scope: entity.scope, identity: entity.identity })
                      }
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

function SelectedEntitySummary({
  entity,
  diagnosticCount,
}: {
  readonly entity: PathDerivedModelEntity | undefined;
  readonly diagnosticCount: number;
}) {
  if (!entity) {
    return (
      <aside className="entity-summary" aria-label="Selected entity summary">
        <p className="empty-entities">Select an entity to see its path-derived summary.</p>
      </aside>
    );
  }

  return (
    <aside className="entity-summary" aria-label="Selected entity summary">
      <p className="eyebrow">Selected entity</p>
      <h3>{entity.displayName}</h3>
      <p>
        This summary is derived from the entity file path only. Semantic metadata, references, and
        backlinks remain deferred to Validator-backed Explorer capabilities.
      </p>

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
          <dt>Display name</dt>
          <dd>{entity.displayName}</dd>
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
    </aside>
  );
}

function SourcePanel({
  diagnostics,
  entity,
  selectedDiagnostic,
  sourceView,
}: {
  readonly diagnostics: readonly DiagnosticViewModel[];
  readonly entity: PathDerivedModelEntity | undefined;
  readonly selectedDiagnostic: DiagnosticSelection | undefined;
  readonly sourceView: SourceFileViewModel | undefined;
}) {
  if (!entity) {
    return null;
  }

  if (!sourceView) {
    return (
      <section className="source-panel" aria-labelledby="source-panel-title">
        <p className="eyebrow">Source</p>
        <h3 id="source-panel-title">Source</h3>
        <p className="missing-source">
          Source file <code>{entity.filePath}</code> is not available in the extracted workspace.
        </p>
        <SelectedDiagnosticContext selection={selectedDiagnostic} />
      </section>
    );
  }

  return (
    <section className="source-panel" aria-labelledby="source-panel-title">
      <p className="eyebrow">Source</p>
      <h3 id="source-panel-title">Source</h3>
      <p>
        Raw, read-only source text from the extracted workspace entry. Explorer does not parse this
        YAML or JSON for semantic fields.
      </p>

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

      <SelectedDiagnosticContext selection={selectedDiagnostic} />
      <SelectedSourceDiagnostics diagnostics={diagnostics} />

      <pre className="source-code"><code>{sourceView.content}</code></pre>
    </section>
  );
}

function SelectedSourceDiagnostics({
  diagnostics,
}: {
  readonly diagnostics: readonly DiagnosticViewModel[];
}) {
  return (
    <div className="selected-source-diagnostics" aria-label="Diagnostics for selected source file">
      <h4>Diagnostics for this file</h4>
      {diagnostics.length > 0 ? (
        <ul className="diagnostic-list diagnostic-list--compact">
          {diagnostics.map((diagnostic, index) => (
            <DiagnosticItem
              diagnostic={diagnostic}
              key={`${diagnostic.filePath ?? 'source'}-${index}`}
            />
          ))}
        </ul>
      ) : (
        <p className="empty-diagnostics">No Validator diagnostics match this source file path.</p>
      )}
    </div>
  );
}

function SelectedDiagnosticContext({
  selection,
}: {
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
            <span className={`severity severity--${diagnostic.severity}`}>
              {diagnostic.severity}
            </span>
          </dd>
        </div>
        <div>
          <dt>Message</dt>
          <dd>{diagnostic.message}</dd>
        </div>
        <div>
          <dt>File path</dt>
          <dd>
            {diagnostic.filePath ? <code>{diagnostic.filePath}</code> : 'No file path reported'}
          </dd>
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
    </aside>
  );
}

function ValidationDiagnostics({
  selectedDiagnostic,
  validation,
  onSelectDiagnostic,
}: {
  readonly selectedDiagnostic: DiagnosticSelection | undefined;
  readonly validation: ValidationResultViewModel;
  readonly onSelectDiagnostic: (diagnostic: DiagnosticViewModel) => void;
}) {
  return (
    <div className="diagnostics-panel">
      <p className="diagnostic-count">
        Diagnostic count: <strong>{validation.diagnostics.length}</strong>
      </p>

      {validation.diagnostics.length > 0 ? (
        <ul className="diagnostic-list">
          {validation.diagnostics.map((diagnostic, index) => (
            <DiagnosticItem
              diagnostic={diagnostic}
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
  isSelected = false,
  onSelect,
}: {
  readonly diagnostic: DiagnosticViewModel;
  readonly isSelected?: boolean;
  readonly onSelect?: () => void;
}) {
  const content = (
    <>
      <span className={`severity severity--${diagnostic.severity}`}>{diagnostic.severity}</span>
      <span className="diagnostic-message">{diagnostic.message}</span>
      {diagnostic.filePath ? <code>{diagnostic.filePath}</code> : null}
      {diagnostic.fieldPath ? <code>{diagnostic.fieldPath}</code> : null}
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
