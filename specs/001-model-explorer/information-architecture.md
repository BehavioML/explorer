# Model Explorer Information Architecture

## Status

Initial product information architecture for the BehavioML Model Explorer.

This document refines the source specification by describing how model information should be organized, navigated, and progressively revealed. It does not define UI components, framework choices, visual styling details, API contracts, or implementation tasks.

## Purpose

The Explorer should help users understand a BehavioML workspace quickly without forcing them to read raw YAML first.

The core experience is:

```text
load workspace
        -> understand model health and structure
        -> select a model entity
        -> switch contextual views
        -> navigate references, backlinks, diagnostics, and artifacts
        -> return to context without getting lost
```

The Explorer should feel like a semantic model browser, not a file tree with previews.

## Information principles

- Preserve context while users move between views.
- Show concise summaries before raw source.
- Make references, backlinks, diagnostics, and search results actionable.
- Use progressive disclosure to avoid overwhelming users.
- Keep BehavioML model content separate from source specs, compliance artifacts, generated artifacts, and validation output.
- Treat generated diagrams and reports as derived views, not source of truth.
- Treat source specs and compliance artifacts as supporting context, not model content.
- Prefer semantic grouping over filesystem grouping when helping users understand the model.
- Keep raw source accessible for trust and precision.

## Top-level workspace states

The Explorer should have clear product states for workspace loading and review.

| State | Meaning | Primary user need |
| --- | --- | --- |
| Empty | No workspace loaded yet | Choose upload or remote archive URL |
| Loading archive | Archive is being fetched, uploaded, or extracted | Understand progress and recover from errors |
| Workspace detected | A recognizable BehavioML workspace root has been found | Confirm what was loaded |
| Indexing model | Model files are being parsed and indexed | Wait without losing confidence |
| Ready | Model index is available | Start exploring |
| Validation running | Validator is executing or refreshing diagnostics | Understand model health update |
| Invalid archive | Archive cannot be fetched, extracted, or understood | Fix input |
| No workspace found | Archive is valid but no supported workspace root was detected | Understand expected layout |
| Ambiguous workspace | More than one plausible workspace root was found | Choose or clarify root |
| Validation failed | Validator could not complete | Inspect failure separately from model diagnostics |

These are product states, not prescribed implementation state machines.

## Workspace overview

The workspace overview is the first useful view after loading.

It should answer:

- What workspace was loaded?
- Which model root was detected?
- What BehavioML scopes are present?
- How many entities exist per scope?
- Are there validation errors or warnings?
- Are generated artifacts available?
- Are source specs or compliance artifacts available?
- What are the best entry points for exploration?

Recommended overview sections:

| Section | Content |
| --- | --- |
| Workspace summary | Archive name or URL, detected root, load status |
| Model health | Validation status, error/warning counts, last validation run if known |
| Scope summary | Counts for workflows, roles, capabilities, interfaces, components, modules, entities, events, state machines, decisions |
| Entry points | Important workflows, recently opened entities, diagnostics, generated diagrams |
| Supporting context | Source specs, compliance artifacts, traceability maps when discovered |
| Load issues | Non-blocking warnings from archive parsing or workspace detection |

The overview should avoid showing dense raw file lists by default.

## Entity browser

The entity browser helps users move through model content by BehavioML semantics.

Primary grouping should be by model scope:

- workflows
- roles
- capabilities
- interfaces
- components
- modules
- entities
- events
- state machines
- decisions

The browser may also support secondary groupings such as folders, diagnostics status, recently visited, or search-filtered results, but those should not replace semantic grouping.

Each item should show a compact summary:

- kind/scope;
- path identity;
- display name or label when available;
- short description when available;
- diagnostic status when known;
- simple relationship hints when useful.

## Entity detail

Entity detail is the central context-preserving view for a selected BehavioML element.

It should answer:

- What is this entity?
- Where is it defined?
- What does it reference?
- What references it?
- Does it have diagnostics?
- What related workflows, capabilities, state transitions, events, components, interfaces, or decisions matter?
- What source YAML defines it?
- What generated or supporting artifacts are relevant?

Recommended detail sections:

| Section | Purpose |
| --- | --- |
| Header | Scope, path identity, title/name, diagnostic status |
| Summary | Concise human-readable explanation derived from model fields |
| Primary relationships | Most important references and backlinks |
| Contextual views | Tabs or equivalent view switching for source, diagnostics, backlinks, generated artifacts, etc. |
| Source location | Path to source YAML and optional line/field location when available |
| Supporting context | Source spec or compliance links when traceability exists |

Raw YAML should be one available view, not the default understanding mechanism unless the entity has no richer summary.

## Workflow view

Workflow view should make ordered behavior understandable.

It should show:

- workflow identity and purpose;
- participating roles;
- ordered steps;
- local actions versus role-to-role interactions;
- referenced capabilities;
- referenced events where modeled;
- diagnostics relevant to the workflow;
- generated diagram link or preview when available;
- source YAML access.

Workflow steps should be navigable:

- `from` role references should navigate to the role when resolvable;
- `to` role references should navigate to the role when present and resolvable;
- `capability` references should navigate to the capability when resolvable;
- events or other modeled references should navigate when resolvable.

The workflow view should not infer hidden interactions, callbacks, retries, redirects, or protocol follow-ups that are not modeled.

## References and backlinks view

References and backlinks are core to the Explorer.

The references view should show outgoing model references from the selected entity.

The backlinks view should show incoming references to the selected entity.

Each relationship item should show:

- source entity;
- target entity;
- relationship field or reason when known;
- resolved/unresolved status;
- diagnostic status if the relationship is problematic;
- navigation action.

The view should distinguish:

- resolved references;
- unresolved references;
- polymorphic typed references;
- generated/supporting artifact links;
- external traceability links.

## Diagnostics view

Diagnostics should be both global and contextual.

Global diagnostics view should support:

- errors, warnings, and informational diagnostics when available;
- filtering by severity;
- filtering by scope/entity;
- grouping by file, entity, rule, or severity;
- navigation to affected entity or source file when possible;
- clear separation between validation diagnostics and workspace load failures.

Entity-level diagnostics should appear inside entity detail views.

The Explorer should avoid treating diagnostics as a disconnected table. Diagnostics are model review metadata and should be visible in the places where users need them.

## Generated artifacts view

Generated artifacts may include diagrams, reports, or other derived views.

The Explorer should show generated artifacts when present, but generated artifacts are not source of truth.

Generated artifact view should answer:

- What generated artifacts are available?
- Which model entities or workflows are they related to?
- When was the artifact generated, if metadata exists?
- Can the user navigate from artifact to model context?

For MVP, the Explorer should display generated artifacts when present. Generating diagrams on demand is deferred.

## Source YAML view

Source YAML view exists for precision, trust, and debugging.

It should show:

- file path;
- YAML content;
- selected entity context;
- highlighted location when available;
- diagnostics anchored to source when possible;
- navigation back to semantic entity detail.

Source YAML should not be the primary entry point for understanding a model, but it must always be available for exact inspection.

## Search experience

Search should be contextual and actionable.

Search should support finding:

- entity identifiers;
- path identities;
- labels or names;
- scopes;
- descriptions;
- references;
- backlinks;
- diagnostics;
- generated artifact names or metadata;
- source spec or compliance references when discovered.

Search results should be grouped or labeled by kind so users can distinguish workflows, capabilities, diagnostics, files, generated artifacts, and supporting documents.

Selecting a search result should navigate to the relevant semantic context, not merely open a file when a semantic target is known.

## Source spec and compliance context

Source specs and compliance artifacts are optional supporting context.

When discovered, they may appear in:

- workspace overview;
- supporting context view;
- entity detail when external traceability connects them to model elements;
- search results.

The Explorer should not require traceability metadata to load or validate a model.

Source specs and compliance artifacts should not be mixed into BehavioML model scopes.

## Progressive disclosure model

The Explorer should reveal information in layers.

| Layer | Content | Purpose |
| --- | --- | --- |
| Summary | Identity, kind, title, short description, health | Fast orientation |
| Relationships | References, backlinks, related workflows/capabilities/events | Understand context |
| Review metadata | Diagnostics, validation status, generated artifacts, traceability | Review and verify |
| Source | YAML, file path, exact fields/lines | Precision and debugging |

The UI should avoid placing all layers on screen at once unless the user explicitly expands or switches to them.

## Context preservation

Context preservation is a core requirement.

When users switch views, the Explorer should preserve where possible:

- selected entity;
- selected workspace root;
- active search query;
- active diagnostics filter;
- navigation history;
- source location;
- surrounding workflow or relationship context.

Examples:

- A user viewing a capability should be able to switch from summary to source YAML and back without losing the selected capability.
- A user following a workflow step to a capability should be able to navigate back to the workflow step context.
- A user selecting a diagnostic should be able to move to the affected entity and return to the diagnostics list.

## Navigation history

The Explorer should provide a way for users to recover context after navigation.

Product-level options include:

- browser back/forward integration;
- internal navigation history;
- breadcrumbs;
- recently visited entities.

This document does not prescribe which mechanism is used.

## Empty and degraded states

The Explorer should handle incomplete workspaces gracefully.

Examples:

| Situation | Expected behavior |
| --- | --- |
| No generated artifacts | Hide or explain generated artifacts view without treating it as an error |
| No source specs | Load model normally and omit source spec context |
| No compliance artifacts | Load model normally and omit compliance context |
| No traceability map | Load model normally and omit source-to-model links |
| Validation unavailable | Show model if indexable and explain validation is unavailable |
| Unresolved reference | Show unresolved reference, diagnostic if available, and source context |
| Partial parse failure | Show load/validation problem without inventing missing model content |

## MVP information architecture

The first useful Explorer should prioritize:

1. archive load and workspace detection;
2. workspace overview;
3. semantic entity browser;
4. entity detail summary;
5. clickable references;
6. backlinks;
7. source YAML view;
8. validation diagnostics view;
9. contextual search;
10. generated artifact display when artifacts are present.

Optional source spec and compliance context should be discovered early if straightforward, but it should not block the model exploration MVP.

## Deferred information architecture

Deferred IA topics include:

- full interactive graph visualization;
- diagram generation on demand;
- editing or patching model files;
- writing traceability mappings from the UI;
- authenticated archive sources;
- direct repository browser integration;
- advanced query language;
- multi-workspace comparison;
- saved review sessions;
- collaborative review annotations.

## Open questions

- What is the minimal workspace overview that feels useful without being noisy?
- Which entity fields should appear in the default summary for each BehavioML scope?
- Should workflow view be the primary entry point for most users?
- How should diagnostics be grouped by default?
- How much search syntax should be exposed in MVP?
- Should source specs and compliance artifacts have their own navigation area or appear only as contextual links?
- What generated artifact metadata is available or needed for artifact-to-model navigation?
- How should ambiguous workspace roots be presented to users?
- What entity relationship hints can be shown without turning BehavioML into an ERD?
