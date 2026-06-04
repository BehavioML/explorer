export type DiagnosticSeverity = 'error' | 'warning' | 'info' | string;

export interface DiagnosticViewModel {
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly filePath?: string;
  readonly fieldPath?: string;
}

export interface ValidationResultViewModel {
  readonly ok: boolean;
  readonly diagnostics: readonly DiagnosticViewModel[];
  readonly summary?: unknown;
  readonly coverage?: unknown;
}
