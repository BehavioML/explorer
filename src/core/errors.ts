export type ApplicationErrorKind =
  | 'not_implemented'
  | 'adapter_error'
  | 'validation_unavailable'
  | 'unsupported_archive_type'
  | 'archive_extraction_failed'
  | 'workspace_root_not_found'
  | 'workspace_root_ambiguous';

export class ApplicationError extends Error {
  readonly kind: ApplicationErrorKind;

  constructor(kind: ApplicationErrorKind, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ApplicationError';
    this.kind = kind;
  }
}

export function notImplemented(message: string): ApplicationError {
  return new ApplicationError('not_implemented', message);
}

export function adapterError(
  kind: Exclude<ApplicationErrorKind, 'not_implemented'>,
  message: string,
  cause?: unknown,
): ApplicationError {
  return new ApplicationError(kind, message, cause instanceof Error ? { cause } : undefined);
}
