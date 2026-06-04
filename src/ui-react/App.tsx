import { useState } from 'react';
import { extractUploadedArchive } from '../adapters/browser';
import { validateInMemoryModelWorkspace } from '../adapters/validator';
import {
  BEHAVIOML_MODEL_SCOPE_DIRECTORIES,
  createPathDerivedEntityIndex,
  createValidatedWorkspaceOverview,
  createWorkspaceOverview,
  findSelectedEntity,
  getDefaultEntitySelection,
  type DiagnosticViewModel,
  type PathDerivedEntityIndex,
  type PathDerivedEntitySelection,
  type PathDerivedModelEntity,
  type ValidationResultViewModel,
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
    message: 'No workspace loaded. Choose a .tgz or .tar.gz archive to validate it in memory.',
  });
  const [workspaceOverview, setWorkspaceOverview] = useState<WorkspaceOverviewViewModel>();
  const [entityIndex, setEntityIndex] = useState<PathDerivedEntityIndex>();
  const [selectedEntity, setSelectedEntity] = useState<PathDerivedEntitySelection>();

  async function handleArchiveSelected(file: File | undefined) {
    if (!file) {
      return;
    }

    setWorkspaceOverview(undefined);
    setEntityIndex(undefined);
    setSelectedEntity(undefined);
    setStatus({ kind: 'loading', message: `Extracting ${file.name} in the browser...` });

    try {
      const workspace = await extractUploadedArchive({ kind: 'uploaded_archive', file });
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
            Upload a <code>.tgz</code> or <code>.tar.gz</code> archive whose model root is either at
            the archive root, under <code>behavioml/</code>, or under <code>behavioml/model/</code>.
            Remote URL loading remains deferred.
          </p>
        </div>

        <label className="upload-placeholder">
          <span>Choose .tgz or .tar.gz archive</span>
          <input
            type="file"
            accept=".tgz,.tar.gz,application/gzip"
            disabled={status.kind === 'loading'}
            onChange={(event) => void handleArchiveSelected(event.currentTarget.files?.[0])}
          />
        </label>
      </section>

      {workspaceOverview ? <WorkspaceOverview overview={workspaceOverview} /> : null}

      {entityIndex ? (
        <EntityBrowser
          diagnostics={validation?.diagnostics ?? []}
          index={entityIndex}
          selectedEntity={selectedEntity}
          onSelectEntity={setSelectedEntity}
        />
      ) : null}

      <section className="status-panel" aria-labelledby="validation-status-title">
        <p className="eyebrow">Validation</p>
        <h2 id="validation-status-title">Validation status</h2>
        <p className={`status-message status-message--${status.kind}`}>{status.message}</p>

        {validation ? <ValidationDiagnostics validation={validation} /> : null}

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
  index,
  selectedEntity,
  onSelectEntity,
}: {
  readonly diagnostics: readonly DiagnosticViewModel[];
  readonly index: PathDerivedEntityIndex;
  readonly selectedEntity: PathDerivedEntitySelection;
  readonly onSelectEntity: (selection: PathDerivedEntitySelection) => void;
}) {
  const selected = findSelectedEntity(index, selectedEntity);
  const selectedDiagnostics = selected ? diagnosticsForFile(diagnostics, selected.filePath) : [];

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
          <SelectedEntitySummary entity={selected} diagnosticCount={selectedDiagnostics.length} />
        </div>
      ) : (
        <p className="empty-entities">
          No path-derived model entities were found in known BehavioML scope directories.
        </p>
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

function diagnosticsForFile(
  diagnostics: readonly DiagnosticViewModel[],
  filePath: string,
): readonly DiagnosticViewModel[] {
  return diagnostics.filter((diagnostic) => diagnostic.filePath === filePath);
}

function ValidationDiagnostics({
  validation,
}: {
  readonly validation: ValidationResultViewModel;
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
              key={`${diagnostic.filePath ?? 'workspace'}-${index}`}
            />
          ))}
        </ul>
      ) : (
        <p className="empty-diagnostics">No diagnostics were reported by the Validator.</p>
      )}
    </div>
  );
}

function DiagnosticItem({ diagnostic }: { readonly diagnostic: DiagnosticViewModel }) {
  return (
    <li className="diagnostic-item">
      <span className={`severity severity--${diagnostic.severity}`}>{diagnostic.severity}</span>
      <span className="diagnostic-message">{diagnostic.message}</span>
      {diagnostic.filePath ? <code>{diagnostic.filePath}</code> : null}
      {diagnostic.fieldPath ? <code>{diagnostic.fieldPath}</code> : null}
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
