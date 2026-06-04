import { useState } from 'react';
import { extractUploadedArchive } from '../adapters/browser';
import { validateInMemoryModelWorkspace } from '../adapters/validator';
import type { DiagnosticViewModel, ValidationResultViewModel } from '../core';

interface LoadedWorkspaceSummary {
  readonly sourceLabel: string;
  readonly modelRoot: string;
  readonly fileCount: number;
}

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
  const [workspaceSummary, setWorkspaceSummary] = useState<LoadedWorkspaceSummary | undefined>();

  async function handleArchiveSelected(file: File | undefined) {
    if (!file) {
      return;
    }

    setWorkspaceSummary(undefined);
    setStatus({ kind: 'loading', message: `Extracting ${file.name} in the browser...` });

    try {
      const workspace = await extractUploadedArchive({ kind: 'uploaded_archive', file });
      setWorkspaceSummary({
        sourceLabel: workspace.sourceLabel,
        modelRoot: workspace.modelRoot || '<archive root>',
        fileCount: workspace.files.length,
      });
      setStatus({
        kind: 'loading',
        message: `Validating ${workspace.files.length} extracted model file${workspace.files.length === 1 ? '' : 's'}...`,
      });

      const validationResult = await validateInMemoryModelWorkspace(workspace.files);

      if (validationResult.status === 'adapter_error') {
        setStatus({ kind: 'error', message: validationResult.error.message });
        return;
      }

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
          it in the browser, validating the in-memory workspace, and showing Validator diagnostics.
        </p>
      </section>

      <section className="workspace-panel" aria-labelledby="workspace-loading-title">
        <div>
          <p className="eyebrow">Workspace</p>
          <h2 id="workspace-loading-title">Load a model archive</h2>
          <p>
            Upload a <code>.tgz</code> or <code>.tar.gz</code> archive whose model root is either at
            the archive root or under <code>behavioml/</code>. Remote URL loading remains deferred.
          </p>
          {workspaceSummary ? <WorkspaceSummary summary={workspaceSummary} /> : null}
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

function WorkspaceSummary({ summary }: { readonly summary: LoadedWorkspaceSummary }) {
  return (
    <dl className="workspace-summary" aria-label="Loaded workspace summary">
      <div>
        <dt>Archive</dt>
        <dd>{summary.sourceLabel}</dd>
      </div>
      <div>
        <dt>Model root</dt>
        <dd>{summary.modelRoot}</dd>
      </div>
      <div>
        <dt>Validation files</dt>
        <dd>{summary.fileCount}</dd>
      </div>
    </dl>
  );
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
