import { gunzipSync, unzipSync } from 'fflate';
import {
  ApplicationError,
  adapterError,
  detectWorkspaceRoot,
  notImplemented,
  normalizeWorkspacePath,
  type ArchiveExtractionResult,
  type WorkspaceFileEntry,
} from '../../core';

export interface UploadedArchiveInput {
  readonly kind: 'uploaded_archive';
  readonly file: File;
}

export interface RemoteArchiveUrlInput {
  readonly kind: 'remote_archive_url';
  readonly url: string;
}

export type BrowserArchiveInput = UploadedArchiveInput | RemoteArchiveUrlInput;

export type ExtractedArchiveWorkspace = ArchiveExtractionResult;

const TAR_BLOCK_SIZE = 512;
const TEXT_FILE_EXTENSION_PATTERN = /\.(?:ya?ml|json)$/i;

type SupportedArchiveType = 'tar_gzip' | 'zip';

export async function extractUploadedArchive(
  input: UploadedArchiveInput,
): Promise<ExtractedArchiveWorkspace> {
  assertSupportedArchiveName(input.file.name);

  try {
    return await extractArchiveBytes(await input.file.arrayBuffer(), input.file.name);
  } catch (cause) {
    if (cause instanceof ApplicationError) {
      throw cause;
    }

    throw adapterError(
      'archive_extraction_failed',
      `Could not extract uploaded archive "${input.file.name}".`,
      cause,
    );
  }
}

export async function fetchRemoteArchive(_input: RemoteArchiveUrlInput): Promise<ArrayBuffer> {
  throw notImplemented(
    'Remote archive fetching is intentionally deferred for the first Explorer vertical slice.',
  );
}

export async function extractArchiveBytes(
  archiveBytes: ArrayBuffer,
  sourceLabel: string,
): Promise<ExtractedArchiveWorkspace> {
  const archiveType = getSupportedArchiveType(sourceLabel);

  try {
    const archiveFiles =
      archiveType === 'zip'
        ? extractRegularTextFilesFromZip(new Uint8Array(archiveBytes))
        : extractRegularTextFilesFromTar(gunzipSync(new Uint8Array(archiveBytes)));

    return createExtractedArchiveWorkspace(archiveFiles, sourceLabel);
  } catch (cause) {
    if (cause instanceof ApplicationError) {
      throw cause;
    }

    throw adapterError(
      'archive_extraction_failed',
      `Could not extract ${formatArchiveTypeForError(archiveType)} archive "${sourceLabel}".`,
      cause,
    );
  }
}

function assertSupportedArchiveName(sourceLabel: string): void {
  getSupportedArchiveType(sourceLabel);
}

function getSupportedArchiveType(sourceLabel: string): SupportedArchiveType {
  const lowerName = sourceLabel.toLowerCase();

  if (lowerName.endsWith('.zip')) {
    return 'zip';
  }

  if (lowerName.endsWith('.tgz') || lowerName.endsWith('.tar.gz')) {
    return 'tar_gzip';
  }

  throw adapterError(
    'unsupported_archive_type',
    `Unsupported archive type for "${sourceLabel}". Upload a \`.tgz\`, \`.tar.gz\`, or \`.zip\` archive.`,
  );
}

function formatArchiveTypeForError(archiveType: SupportedArchiveType): string {
  return archiveType === 'zip' ? '.zip' : '.tgz/.tar.gz';
}

function createExtractedArchiveWorkspace(
  archiveFiles: readonly WorkspaceFileEntry[],
  sourceLabel: string,
): ExtractedArchiveWorkspace {
  const detectedWorkspace = detectWorkspaceRoot(archiveFiles);
  const validationFiles = detectedWorkspace.files.filter(isRelevantValidationFile);

  if (validationFiles.length === 0) {
    throw adapterError(
      'workspace_root_not_found',
      'A BehavioML model root was found, but it did not contain YAML or JSON model files relevant for validation.',
    );
  }

  return {
    files: validationFiles,
    sourceLabel,
    modelRoot: detectedWorkspace.rootPath,
  };
}

export function extractRegularTextFilesFromZip(zipBytes: Uint8Array): WorkspaceFileEntry[] {
  const files: WorkspaceFileEntry[] = [];
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const entries = unzipSync(zipBytes);

  for (const [path, contentBytes] of Object.entries(entries)) {
    if (isDirectoryPath(path) || !TEXT_FILE_EXTENSION_PATTERN.test(path)) {
      continue;
    }

    const normalizedPath = normalizeWorkspacePath(path);

    try {
      files.push({ path: normalizedPath, content: decoder.decode(contentBytes) });
    } catch (cause) {
      throw adapterError(
        'archive_extraction_failed',
        `Archive entry "${path}" is not valid UTF-8 text and cannot be loaded for validation.`,
        cause,
      );
    }
  }

  return files;
}

function isDirectoryPath(path: string): boolean {
  return path.endsWith('/') || path.endsWith('\\');
}

function extractRegularTextFilesFromTar(tarBytes: Uint8Array): WorkspaceFileEntry[] {
  const files: WorkspaceFileEntry[] = [];
  const decoder = new TextDecoder('utf-8', { fatal: true });

  for (let offset = 0; offset + TAR_BLOCK_SIZE <= tarBytes.length; ) {
    const header = tarBytes.subarray(offset, offset + TAR_BLOCK_SIZE);

    if (isZeroBlock(header)) {
      break;
    }

    const path = readTarPath(header);
    const size = readTarOctal(header, 124, 12);
    const typeFlag = String.fromCharCode(header[156] ?? 0);
    const contentOffset = offset + TAR_BLOCK_SIZE;
    const nextOffset = contentOffset + Math.ceil(size / TAR_BLOCK_SIZE) * TAR_BLOCK_SIZE;

    if (nextOffset > tarBytes.length) {
      throw adapterError(
        'archive_extraction_failed',
        `Archive entry "${path}" extends past the end of the tar payload.`,
      );
    }

    if (isRegularTarEntry(typeFlag) && TEXT_FILE_EXTENSION_PATTERN.test(path)) {
      const normalizedPath = normalizeWorkspacePath(path);
      const contentBytes = tarBytes.subarray(contentOffset, contentOffset + size);

      try {
        files.push({ path: normalizedPath, content: decoder.decode(contentBytes) });
      } catch (cause) {
        throw adapterError(
          'archive_extraction_failed',
          `Archive entry "${path}" is not valid UTF-8 text and cannot be loaded for validation.`,
          cause,
        );
      }
    }

    offset = nextOffset;
  }

  return files;
}

function readTarPath(header: Uint8Array): string {
  const name = readNullTerminatedString(header, 0, 100);
  const prefix = readNullTerminatedString(header, 345, 155);
  return prefix ? `${prefix}/${name}` : name;
}

function readTarOctal(header: Uint8Array, start: number, length: number): number {
  const rawValue = readNullTerminatedString(header, start, length).trim();

  if (!rawValue) {
    return 0;
  }

  const value = Number.parseInt(rawValue, 8);

  if (Number.isNaN(value)) {
    throw adapterError('archive_extraction_failed', `Invalid tar size value "${rawValue}".`);
  }

  return value;
}

function readNullTerminatedString(bytes: Uint8Array, start: number, length: number): string {
  const end = start + length;
  let cursor = start;

  while (cursor < end && bytes[cursor] !== 0) {
    cursor += 1;
  }

  return new TextDecoder().decode(bytes.subarray(start, cursor));
}

function isZeroBlock(block: Uint8Array): boolean {
  return block.every((byte) => byte === 0);
}

function isRegularTarEntry(typeFlag: string): boolean {
  return typeFlag === '0' || typeFlag === '\0';
}

function isRelevantValidationFile(file: WorkspaceFileEntry): boolean {
  return TEXT_FILE_EXTENSION_PATTERN.test(file.path);
}
