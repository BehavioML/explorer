# Model Explorer Interaction Model

## Status

Product interaction model for the next major Explorer UI phase.

This document describes intended user workflows and interaction behavior. It does not prescribe implementation details, framework behavior, CSS, component structure, or state-management mechanisms.

## Workbench mental model

The Explorer should behave like a read-only model workbench:

- the loaded workspace is the project;
- the activity bar changes the user’s mode of work;
- the explorer tree selects model context;
- tabs preserve active investigation threads;
- the main workspace shows source, diagrams, relationships, or overview content;
- the inspector explains the current selection;
- diagnostics and search support navigation rather than replacing it.

Users should be able to move from overview to entity to source to diagnostic to relationship and back without feeling that each step is a separate report page.

## Primary workflows

### Load archive

1. User starts with no workspace loaded.
2. User selects a supported archive.
3. Explorer communicates extraction, root detection, and validation status.
4. When a workspace is detected, Explorer opens the workspace overview.
5. If loading fails, Explorer explains whether the issue is archive format, extraction, missing root, ambiguous root, or validation availability.

Loading should establish the workspace context; it should not immediately overwhelm users with raw diagnostics or file lists.

### Inspect overview

The overview should answer what was loaded, what model scopes exist, whether diagnostics are present, and where to start.

Expected behavior:

- overview is the default first tab after a successful load;
- scope summaries navigate to the explorer tree or filtered entity lists;
- diagnostic summaries navigate to diagnostics;
- generated diagram availability should be visible when present;
- overview should remain concise and should not become a report dump.

### Browse entities

Users browse entities through scope-oriented navigation.

Expected behavior:

- selecting an entity updates the main workspace and inspector;
- selection should preserve the current workspace context where possible;
- scope grouping is primary; filesystem grouping may be secondary;
- current limitations, such as path-derived entities, should be explained contextually rather than repeated throughout the UI.

### Inspect source

Source inspection is a primary workflow because source is the authoritative artifact users need to trust.

Expected behavior:

- selecting an entity can open or focus its source view;
- source views show the selected file and relevant source context;
- diagnostics and search matches should annotate or accompany source context when possible;
- source inspection should support returning to entity, relationship, diagnostics, or search context.

### Inspect diagnostics

Diagnostics are a supporting review workflow.

Expected behavior:

- global diagnostics are accessible from a dedicated activity or panel;
- diagnostics can be filtered or grouped by severity, file, entity, or scope when available;
- selecting a diagnostic navigates to the affected source or entity when possible;
- diagnostic details appear contextually in the inspector or diagnostics panel;
- diagnostics should not replace source and relationship navigation as the center of the product.

### Search workspace

Search should be global, contextual, and actionable.

Expected behavior:

- search is available from the workbench shell;
- results are grouped or labeled by kind;
- selecting a result navigates to entity, source, diagnostic, generated artifact, or supporting artifact context when known;
- source-only matches should be shown without pretending a semantic entity is known;
- the user should be able to return to previous context after search navigation.

### Future diagram navigation

Diagrams should become primary navigation surfaces once available.

Expected behavior:

- diagram views can open in workspace tabs;
- selecting a diagram node or edge updates the inspector and related model context;
- diagram selections can navigate to source and relationships;
- diagrams are derived navigation aids, not source of truth;
- lack of diagrams should not block source or entity exploration.

## Overview behavior

The overview is the first orientation surface for a loaded workspace. It should:

- summarize workspace identity, model root, scope counts, and model health;
- present clear entry points into entities, diagnostics, source, and future diagrams;
- avoid dense metadata or full report content;
- be reopenable from navigation after the user moves elsewhere.

## Entity selection behavior

Entity selection should:

- update the active workspace context;
- reveal source, summary, relationship, and diagnostic context for that entity;
- keep surrounding navigation visible;
- clear or preserve secondary selections according to user intent;
- support navigation history or another recovery mechanism.

Selecting an entity should not feel like leaving the workspace; it should feel like focusing an item inside the same workbench.

## Tab and workspace behavior

Workspace tabs should preserve parallel exploration threads.

Expected tab types include:

- overview;
- entity/source context;
- diagnostics;
- search results;
- future diagram views.

Tabs should be conceptual work areas, not arbitrary browser pages. Switching tabs should preserve selection, scroll context, filters, and search text where reasonable.

## Inspector behavior

The inspector is contextual. It should explain the active selection without competing with primary content.

Inspector content may include:

- selected entity identity and scope;
- source path and source-location metadata;
- selected diagnostic detail;
- selected search-match detail;
- generated-artifact metadata;
- relationship metadata;
- degraded-state notes.

The inspector should not become the main way to read source, diagrams, or relationship structure.

## Diagnostics behavior

Diagnostics should be visible at three levels:

1. Workspace-level health in the top bar or overview.
2. Global diagnostics list or panel for review.
3. Contextual diagnostics tied to the selected entity or source.

Diagnostics should always try to lead users back to model context. If a diagnostic cannot be matched to an entity or source file, that limitation should be explicit.
