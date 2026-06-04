# Model Explorer Information Architecture

## Status

Product information architecture for the next major Explorer UI phase.

This document captures the UX lessons learned from report-style, dashboard-like, IDE-inspired, and workbench-oriented layout iterations. It defines product structure and information priority only; it does not define implementation details, visual styling, framework choices, or component APIs.

## Product direction

The Explorer should feel like a navigation tool for understanding a BehavioML workspace, not like a generated report.

The product should help users move through source, diagrams, relationships, diagnostics, and supporting context while preserving their location in the workspace. The primary experience is active exploration rather than passive reading.

## Primary user goals

Users come to the Explorer to:

1. Load a BehavioML workspace and confirm the detected model root.
2. Understand the shape and health of the model quickly.
3. Browse model entities by BehavioML scope.
4. Inspect source definitions with enough context to trust what they are seeing.
5. Follow relationships between workflows, roles, capabilities, interfaces, components, modules, entities, events, state machines, and decisions.
6. Review diagnostics without losing the affected entity or source context.
7. Search across the loaded workspace and navigate directly to relevant source, entities, or diagnostics.
8. Use generated diagrams as navigational aids when available.

## Primary navigation areas

The Explorer should organize navigation around a workbench shell:

| Area | Purpose | Information priority |
| --- | --- | --- |
| Top bar | Workspace identity, load status, global search, high-level actions | Primary orientation |
| Activity bar | Switch between major work modes such as overview, explorer, diagrams, diagnostics, and search | Primary navigation |
| Explorer tree | Browse BehavioML scopes and entities | Primary navigation |
| Workspace tabs | Keep multiple exploration contexts available without losing place | Primary workspace context |
| Main workspace | Inspect selected source, diagrams, entity views, or overview content | Primary content |
| Inspector | Show metadata and secondary details for the active selection | Contextual information |
| Diagnostics panel | Review validation issues and navigate to affected model context | Supporting concern |

## Workspace concepts

A loaded workspace is the user’s working context. It includes:

- source archive identity;
- detected model root;
- BehavioML model scopes and entities;
- raw source files used for validation;
- validation state and diagnostics;
- generated artifacts when present;
- supporting source-specification or compliance artifacts when present.

A workspace selection is the active model context. It may be an overview, entity, source file, diagnostic, search result, or future diagram node. Selection should be stable across view changes where possible.

Workspace tabs represent durable exploration contexts. A tab should correspond to something the user is actively inspecting, such as an overview, entity/source view, diagnostics view, search result context, or future diagram view.

## Information hierarchy

The IA should prioritize information in this order:

1. **Source**: the exact BehavioML source files and source locations that define the model.
2. **Diagrams**: visual navigation surfaces that help users understand workflows and relationships.
3. **Relationships**: outgoing references, backlinks, and related model elements.
4. **Entity summaries**: concise identity, scope, name, description, and status for selected entities.
5. **Diagnostics**: validation results tied back to source and model context.
6. **Inspector metadata**: file statistics, field paths, adapter status, generated-artifact metadata, and other secondary facts.
7. **Supporting artifacts**: source specs, compliance documents, traceability maps, and generated reports when present.

This hierarchy means the main workspace should be dominated by source, diagrams, and navigable relationships. Metadata should not compete with the main content.

## Primary versus contextual information

Primary information belongs in persistent navigation or the main workspace:

- loaded workspace identity and detected root;
- model scopes and entity navigation;
- selected source content;
- relationship navigation;
- diagram views when available;
- global diagnostics entry points;
- global search entry points.

Contextual information belongs in inspectors, panels, tooltips, or detail sections:

- file extension, line counts, character counts, and extraction details;
- validation adapter status;
- selected diagnostic field path;
- source-match line context;
- generated-artifact metadata;
- supporting artifact metadata;
- explanatory notes about path-derived or degraded data.

## Key conclusions

The design direction is now clear:

- Source, diagrams, and relationships are primary product surfaces.
- Inspector metadata is contextual and should support the active selection rather than dominate the layout.
- Validation is a supporting concern: it should be visible and navigable, but the product should not feel like a validation report.
- The Explorer should feel like a workbench-style navigation tool for a model workspace, not a linear report or static dashboard.

## Degraded and empty states

The IA should preserve the same hierarchy when data is incomplete:

- no workspace loaded: focus on loading a workspace;
- workspace loaded without semantic index: show source and path-derived navigation with clear limitations;
- validation unavailable: keep exploration available and explain validation status contextually;
- no diagnostics: show healthy status without occupying excessive space;
- no diagrams: reserve diagram navigation as a future capability without blocking source and relationship exploration;
- unresolved references: show the unresolved relationship and link to source context when possible.
