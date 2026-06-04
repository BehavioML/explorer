export type ApplicationErrorKind =
  | 'not_implemented'
  | 'adapter_error'
  | 'validation_unavailable';

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
