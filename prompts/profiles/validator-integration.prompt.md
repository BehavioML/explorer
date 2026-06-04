# validator-integration profile

## Purpose

Provide reusable BehavioML guidance for projects that need to embed, call, or adapt the BehavioML Validator as a semantic model engine.

This profile is generic. It must remain reusable across products, repositories, interfaces, runtimes, and deployment models. Product-specific behavior belongs in product source artifacts, product plans, or consumer adapters, not in this profile.

## Scope

Use this profile when a consumer tool needs to:

- load BehavioML model workspaces;
- validate BehavioML content;
- navigate model entities and references;
- display diagnostics or source locations;
- adapt validator output into a consumer-specific application model;
- support non-filesystem inputs such as uploaded files, extracted archives, remote-loaded workspaces, or in-memory workspaces.

## Semantic ownership

The BehavioML Validator is the source of truth for BehavioML semantics wherever it supports the required behavior.

Validator-owned semantics include:

- BehavioML parsing;
- model loading;
- model scope recognition;
- entity identity rules;
- reference resolution;
- validation rules;
- diagnostics;
- source files and source locations when available;
- indexed model entities and references when available.

Consumer tools must not duplicate, silently fork, or reinterpret validator-owned semantics. If a consumer needs additional indexing, caching, search, grouping, or presentation metadata, that data must be derived from validator output or explicitly documented as consumer-specific and non-authoritative.

If the validator cannot yet expose a semantic needed by a consumer, treat that as a validator integration gap or a consumer limitation. Do not build a second BehavioML parser, resolver, or validator as a shortcut.

## Recommended integration boundary

Keep the validator behind an explicit adapter boundary.

Recommended conceptual layers:

```text
validator_engine
  -> validator_adapter
  -> consumer core/application layer
  -> UI/presentation or delivery layer
```

Layer responsibilities:

- `validator_engine`: the official BehavioML Validator package, CLI, service, or equivalent canonical implementation.
- `validator_adapter`: a narrow consumer-owned integration component that invokes the validator, normalizes result handling, records limitations, and converts validator results into consumer-facing application data without changing BehavioML semantics.
- Consumer core/application layer: depends on the adapter contract, not validator internals; owns product workflows, user actions, caching policy, search policy, and non-authoritative derived indexes.
- UI/presentation or delivery layer: depends on consumer-facing view/application data; it must not call validator internals directly or parse validator output independently.

The adapter boundary should make it clear which errors came from validator diagnostics and which errors came from the consumer tool, transport, archive extraction, remote loading, permissions, or presentation layer.

## Workspace input models

Consumer tools may need to validate different workspace sources. The integration design should preserve validator semantics across all sources.

Common input models:

- Filesystem workspace: files already exist under a local model or workspace directory.
- In-memory workspace: files have already been loaded into memory by a host process.
- Extracted archive workspace: an archive has been unpacked by the consumer or host and represented as files or in-memory entries.
- Remote-loaded workspace: files or archives have been fetched from a remote location before validation.
- Partial or incomplete workspace: only a subset of files is available, such as while editing, previewing, or recovering from a failed load.

Guidance:

- If the validator supports filesystem paths only, document that as a tooling gap and contain filesystem-specific assumptions in the adapter.
- Do not build a second parser or resolver just to support in-memory, archive-backed, or remote-loaded input.
- Prefer adding or using a validator workspace provider abstraction that lets callers provide stable workspace-relative file identifiers and file contents.
- Archive extraction, remote fetching, authentication, decompression, upload handling, and temporary storage are consumer or host responsibilities unless the validator explicitly grows those responsibilities later.
- Partial workspace behavior must be explicit. Missing files should produce validator diagnostics when they violate BehavioML rules, while consumer load failures should be reported as consumer/tool errors.

## Programmatic API expectations

Prefer a programmatic validator API when one is available. The exact schema should evolve from real integration needs and validator capabilities, not be frozen prematurely by a consumer profile.

Conceptually, a useful API should be able to:

- load or parse a workspace;
- validate a workspace;
- return diagnostics as structured data;
- return source file and source-location information when available;
- return indexed model entities when supported;
- return references and reference-resolution results when supported;
- return validation summaries or coverage information when supported;
- distinguish errors, warnings, informational findings, and host/tool failures;
- provide a machine-readable result, not only human-readable text output.

Consumers should depend on the smallest stable surface needed for their workflow. Avoid depending on undocumented validator internals when a public API, exported function, or documented provider boundary exists.

## CLI fallback

If the validator is available only as a CLI, invoke it through the validator adapter rather than from arbitrary consumer code.

CLI fallback guidance:

- Keep subprocess invocation, exit-code handling, stdout/stderr capture, timeout policy, and environment setup inside the adapter.
- Report CLI fallback limitations clearly in validation results or integration documentation.
- Treat CLI stdout/stderr as human-readable unless the validator explicitly documents a machine-readable output contract.
- Do not treat ad-hoc stdout parsing as a stable semantic contract.
- If stdout parsing is temporarily unavoidable, isolate it, test it with fixture outputs, label it as provisional, and prefer replacing it with a documented machine-readable validator API.
- Preserve validator exit-code meaning and distinguish CLI usage errors from model validation diagnostics.

## Diagnostics and traceability

Diagnostics should remain traceable back to model content and validation authority.

Guidance:

- Validator diagnostics should reference model elements, source files, field paths, and source locations when available.
- Validation reports should distinguish validator diagnostics from consumer/tool errors such as workspace loading failures, archive extraction failures, remote fetch failures, adapter failures, and presentation failures.
- Consumer-specific annotations, navigation state, search hits, and UI labels must not be confused with validator diagnostics.
- Source locations should be machine-readable enough for navigation, filtering, grouping, reporting, and automated checks when the validator supports them.
- Traceability to source specifications, product requirements, generated artifacts, or external compliance evidence remains external to validator semantics unless the BehavioML metamodel changes later.
- Do not change the BehavioML metamodel merely to satisfy a consumer display or navigation need.

## Non-goals

This profile does not:

- reimplement the BehavioML Validator;
- add product-specific behavior to validator guidance;
- define a final validator API schema prematurely;
- require a browser, server, local-only, remote-only, or WASM runtime decision;
- require a UI framework decision;
- require archive extraction or remote fetching to live inside the validator;
- require consumer tools to expose every validator feature immediately;
- modify BehavioML model files, source specifications, or the BehavioML metamodel.

## Review checklist

Use this checklist when reviewing a validator integration plan or implementation:

- Does the consumer avoid duplicating validator-owned parsing, loading, reference resolution, diagnostics, and validation semantics?
- Is the Validator clearly documented as the source of truth for BehavioML semantics where supported?
- Is there a clear adapter boundary between the validator and consumer core/application logic?
- Are presentation or delivery layers isolated from validator internals?
- Are consumer-specific indexes, caches, or search structures derived from validator output or clearly labeled non-authoritative?
- Are validator limitations, unsupported semantics, and integration gaps reported honestly?
- Are filesystem, in-memory, archive-backed, remote-loaded, and partial workspace cases handled through a consistent workspace strategy?
- If CLI fallback is used, are subprocess and output-parsing limitations explicit and contained in the adapter?
- Is diagnostic and source-location handling machine-readable enough for the consumer's stated workflow?
- Are validator diagnostics clearly distinguished from consumer/tool errors?
- Does the design avoid product-specific behavior in reusable validator guidance?
- Does the design avoid premature runtime, deployment, framework, or final API schema commitments?
