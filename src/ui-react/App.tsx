import { useState } from 'react';
import { extractUploadedArchive } from '../adapters/browser';
import { ApplicationError } from '../core';

type Status =
  | { readonly kind: 'idle'; readonly message: string }
  | { readonly kind: 'stubbed'; readonly message: string }
  | { readonly kind: 'error'; readonly message: string };

export function App() {
  const [status, setStatus] = useState<Status>({
    kind: 'idle',
    message: 'No workspace loaded. Archive loading is scaffolded but not implemented yet.',
  });

  async function handleArchiveSelected(file: File | undefined) {
    if (!file) {
      return;
    }

    try {
      await extractUploadedArchive({ kind: 'uploaded_archive', file });
    } catch (error) {
      if (error instanceof ApplicationError && error.kind === 'not_implemented') {
        setStatus({ kind: 'stubbed', message: error.message });
        return;
      }

      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Unknown archive loading error.',
      });
    }
  }

  return (
    <main className="app-shell">
      <section className="hero-panel" aria-labelledby="explorer-title">
        <p className="eyebrow">BehavioML</p>
        <h1 id="explorer-title">Model Explorer</h1>
        <p className="hero-copy">
          Initial read-only scaffold for loading, validating, and eventually navigating BehavioML
          model workspaces through clean core, browser adapter, validator adapter, and React UI
          boundaries.
        </p>
      </section>

      <section className="workspace-panel" aria-labelledby="workspace-loading-title">
        <div>
          <p className="eyebrow">Workspace</p>
          <h2 id="workspace-loading-title">Load a model archive</h2>
          <p>
            Upload and remote archive inputs are present as browser adapter boundaries. Real archive
            extraction and remote fetching are intentionally deferred.
          </p>
        </div>

        <label className="upload-placeholder">
          <span>Choose .tgz or .tar.gz archive</span>
          <input
            type="file"
            accept=".tgz,.tar.gz,application/gzip"
            onChange={(event) => void handleArchiveSelected(event.currentTarget.files?.[0])}
          />
        </label>
      </section>

      <section className="status-panel" aria-labelledby="validation-status-title">
        <p className="eyebrow">Validation</p>
        <h2 id="validation-status-title">Validation status</h2>
        <p className={`status-message status-message--${status.kind}`}>{status.message}</p>
        <p className="status-note">
          Validator integration is isolated under <code>src/adapters/validator</code>. The React UI
          does not import the Validator package directly.
        </p>
      </section>
    </main>
  );
}
