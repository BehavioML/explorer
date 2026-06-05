import {
  ApplicationError,
  adapterError,
  detectWorkspaceRoot,
  normalizeWorkspacePath,
  type ArchiveExtractionResult,
  type WorkspaceFileEntry,
} from '../../core';
import { extractRegularTextFilesFromZip } from './archiveInput';

const SPECIFICATIONS_MAIN_ZIP_URL =
  'https://github.com/BehavioML/specifications/archive/refs/heads/main.zip';
const SPECIFICATIONS_ZIP_SOURCE_LABEL = 'BehavioML/specifications main.zip';
const TEXT_FILE_EXTENSION_PATTERN = /\.(?:ya?ml|json)$/i;

export const canonicalExampleDefinitions = [
  {
    id: 'quic',
    label: 'QUIC',
    modelRoot: 'specifications-main/examples/quic/model/',
    sourceLabel: 'BehavioML/specifications/examples/quic',
  },
  {
    id: 'oauth-authorization-code',
    label: 'OAuth Authorization Code',
    modelRoot: 'specifications-main/examples/oauth-authorization-code/model/',
    sourceLabel: 'BehavioML/specifications/examples/oauth-authorization-code',
  },
  {
    id: 'whip',
    label: 'WHIP',
    modelRoot: 'specifications-main/examples/whip/model/',
    sourceLabel: 'BehavioML/specifications/examples/whip',
  },
] as const;

export type CanonicalExampleId = (typeof canonicalExampleDefinitions)[number]['id'];
export type CanonicalExampleDefinition = (typeof canonicalExampleDefinitions)[number];

export async function loadCanonicalExampleWorkspace(
  exampleId: CanonicalExampleId,
): Promise<ArchiveExtractionResult> {
  const archiveBytes = await fetchSpecificationsZip();
  const archiveFiles = extractTextFilesFromSpecificationsZip(archiveBytes);
  return createCanonicalExampleWorkspace(archiveFiles, exampleId);
}

export function createCanonicalExampleWorkspace(
  archiveFiles: readonly WorkspaceFileEntry[],
  exampleId: string,
): ArchiveExtractionResult {
  const example = getCanonicalExampleDefinition(exampleId);
  const selectedFiles = selectCanonicalExampleModelSubtree(archiveFiles, exampleId);

  try {
    const detectedWorkspace = detectWorkspaceRoot(selectedFiles);
    const validationFiles = detectedWorkspace.files.filter(isRelevantValidationFile);

    if (validationFiles.length === 0) {
      throw adapterError(
        'workspace_root_not_found',
        `No model files found for ${example.label} in ${example.sourceLabel}. Expected UTF-8 YAML or JSON files under known BehavioML model scope directories.`,
      );
    }

    return {
      files: validationFiles,
      sourceLabel: example.sourceLabel,
      modelRoot: detectedWorkspace.rootPath,
    };
  } catch (cause) {
    if (cause instanceof ApplicationError) {
      if (cause.kind === 'workspace_root_not_found' || cause.kind === 'workspace_root_ambiguous') {
        throw adapterError(
          'workspace_root_not_found',
          `Invalid archive/root detection result for ${example.label} in ${example.sourceLabel}: ${cause.message}`,
          cause,
        );
      }

      throw cause;
    }

    throw cause;
  }
}

export function selectCanonicalExampleModelSubtree(
  archiveFiles: readonly WorkspaceFileEntry[],
  exampleId: string,
): WorkspaceFileEntry[] {
  const example = getCanonicalExampleDefinition(exampleId);
  const selectedFiles = archiveFiles
    .map((file) => ({ ...file, path: normalizeWorkspacePath(file.path) }))
    .filter((file) => file.path.startsWith(example.modelRoot))
    .map((file) => ({ ...file, path: file.path.slice(example.modelRoot.length) }))
    .filter((file) => file.path.length > 0);

  if (selectedFiles.length === 0) {
    throw adapterError(
      'workspace_root_not_found',
      `Example path missing for ${example.label}: expected ${example.modelRoot} in ${SPECIFICATIONS_ZIP_SOURCE_LABEL}.`,
    );
  }

  return selectedFiles;
}

function getCanonicalExampleDefinition(exampleId: string): CanonicalExampleDefinition {
  const example = canonicalExampleDefinitions.find((definition) => definition.id === exampleId);

  if (!example) {
    throw adapterError(
      'adapter_error',
      `Unknown canonical BehavioML example "${exampleId}". Choose QUIC, OAuth Authorization Code, or WHIP.`,
    );
  }

  return example;
}

async function fetchSpecificationsZip(): Promise<ArrayBuffer> {
  let response: Response;

  try {
    response = await fetch(SPECIFICATIONS_MAIN_ZIP_URL);
  } catch (cause) {
    throw adapterError(
      'archive_extraction_failed',
      `Network error while fetching ${SPECIFICATIONS_ZIP_SOURCE_LABEL}. Check your connection and try again.`,
      cause,
    );
  }

  if (!response.ok) {
    throw adapterError(
      'archive_extraction_failed',
      `GitHub ZIP fetch failed for ${SPECIFICATIONS_ZIP_SOURCE_LABEL}: HTTP ${response.status} ${response.statusText}.`,
    );
  }

  return response.arrayBuffer();
}

function extractTextFilesFromSpecificationsZip(archiveBytes: ArrayBuffer): WorkspaceFileEntry[] {
  return extractRegularTextFilesFromZip(new Uint8Array(archiveBytes));
}

function isRelevantValidationFile(file: WorkspaceFileEntry): boolean {
  return TEXT_FILE_EXTENSION_PATTERN.test(file.path);
}
