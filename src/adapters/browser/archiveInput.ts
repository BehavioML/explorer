import type { WorkspaceFileEntry } from '../../core';
import { notImplemented } from '../../core';

export interface UploadedArchiveInput {
  readonly kind: 'uploaded_archive';
  readonly file: File;
}

export interface RemoteArchiveUrlInput {
  readonly kind: 'remote_archive_url';
  readonly url: string;
}

export type BrowserArchiveInput = UploadedArchiveInput | RemoteArchiveUrlInput;

export interface ExtractedArchiveWorkspace {
  readonly files: readonly WorkspaceFileEntry[];
  readonly sourceLabel: string;
}

export async function extractUploadedArchive(
  _input: UploadedArchiveInput,
): Promise<ExtractedArchiveWorkspace> {
  throw notImplemented(
    'Uploaded archive extraction is not implemented yet. The browser adapter boundary is ready for a future extraction library.',
  );
}

export async function fetchRemoteArchive(_input: RemoteArchiveUrlInput): Promise<ArrayBuffer> {
  throw notImplemented(
    'Remote archive fetching is not implemented yet. The browser adapter boundary is ready for a future fetch implementation.',
  );
}

export async function extractArchiveBytes(
  _archiveBytes: ArrayBuffer,
  _sourceLabel: string,
): Promise<ExtractedArchiveWorkspace> {
  throw notImplemented(
    'Archive byte extraction is not implemented yet. This scaffold intentionally defers .tgz/.tar.gz decompression.',
  );
}
