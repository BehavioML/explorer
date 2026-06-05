type MermaidModule = typeof import('mermaid');

interface MermaidModuleLike {
  readonly default?: unknown;
  readonly initialize?: unknown;
  readonly render?: unknown;
}

interface MermaidApiLike {
  readonly initialize: (config: MermaidRenderConfig) => void;
  readonly render: (id: string, source: string) => Promise<MermaidRenderResponse> | MermaidRenderResponse;
}

interface MermaidRenderConfig {
  readonly startOnLoad: false;
  readonly securityLevel: 'strict';
  readonly htmlLabels: false;
}

interface MermaidRenderResponse {
  readonly svg: string;
}

export interface RenderMermaidDiagramOptions {
  readonly diagramId?: string;
  readonly moduleLoader?: () => Promise<MermaidModuleLike>;
}

export type RenderMermaidDiagramResult =
  | {
      readonly status: 'rendered';
      readonly svg: string;
    }
  | {
      readonly status: 'render_error';
      readonly message: string;
    };

export async function renderMermaidDiagram(
  source: string,
  options: RenderMermaidDiagramOptions = {},
): Promise<RenderMermaidDiagramResult> {
  try {
    const mermaid = await loadMermaidModule(options.moduleLoader);
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      htmlLabels: false,
    });

    const rendered = await mermaid.render(toSafeDiagramRenderId(options.diagramId), source);

    if (typeof rendered.svg !== 'string' || rendered.svg.trim().length === 0) {
      return { status: 'render_error', message: 'Mermaid renderer returned an empty SVG.' };
    }

    return { status: 'rendered', svg: rendered.svg };
  } catch (cause) {
    return {
      status: 'render_error',
      message: cause instanceof Error ? cause.message : 'Mermaid failed to render this diagram.',
    };
  }
}

async function loadMermaidModule(
  moduleLoader: (() => Promise<MermaidModuleLike>) | undefined,
): Promise<MermaidApiLike> {
  const module = moduleLoader ? await moduleLoader() : await import('mermaid') satisfies MermaidModule;
  const api = toMermaidApi(module.default) ?? toMermaidApi(module);

  if (!api) {
    throw new Error('Mermaid renderer is not available.');
  }

  return api;
}

function toMermaidApi(value: unknown): MermaidApiLike | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const candidate = value as {
    readonly initialize?: unknown;
    readonly render?: unknown;
  };

  if (typeof candidate.initialize !== 'function' || typeof candidate.render !== 'function') {
    return undefined;
  }

  return candidate as MermaidApiLike;
}

function toSafeDiagramRenderId(id: string | undefined): string {
  const base = id?.trim() || `behavioml-diagram-${Date.now().toString(36)}`;
  const safe = base.replace(/[^A-Za-z0-9_-]/g, '-');
  return /^[A-Za-z]/.test(safe) ? safe : `diagram-${safe}`;
}
