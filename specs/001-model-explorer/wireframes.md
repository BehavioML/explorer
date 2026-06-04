# Model Explorer Wireframes

## Status

Product wireframes for the next major Explorer UI phase.

These wireframes document layout intent and information priority only. They do not prescribe implementation details, styling systems, CSS, React components, or application behavior.

## Current layout observations

The current vertical slice proves the core loading, overview, path-derived browsing, search, source viewing, and diagnostic-navigation flow. It also reveals several UX lessons:

- the report-style stacked page makes the product feel like a validation/report output rather than a navigation tool;
- dashboard-like summary panels are useful for orientation but should not dominate ongoing exploration;
- IDE-inspired navigation improves context preservation, but the Explorer should remain model-focused rather than code-editor-focused;
- metadata panels are useful, but they should be contextual and secondary;
- source, diagrams, and relationships need the most prominent workspace area;
- diagnostics should be accessible and actionable without becoming the primary product surface.

## Workbench layout proposal

The next UI phase should move toward a workbench layout:

- a top bar for workspace identity, load state, and global search;
- an activity bar for major modes;
- an explorer tree for BehavioML scopes and entities;
- workspace tabs for preserving parallel contexts;
- a central workspace for source, diagrams, relationships, and overview;
- an inspector for contextual metadata;
- a diagnostics panel that can be opened for review and navigation.

## Overall workbench

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Top bar: workspace name/root | validation health | global search | load      │
├──────┬───────────────────────┬───────────────────────────────────┬──────────┤
│      │ Explorer tree          │ Workspace tabs                    │          │
│ Act. │ - Overview             ├───────────────────────────────────┤ Inspector│
│ bar  │ - workflows            │ Main workspace                    │          │
│      │ - roles                │                                   │ Metadata │
│      │ - capabilities         │ Source / diagram / relationships  │ Context  │
│      │ - interfaces           │                                   │ Details  │
│      │ - components           │                                   │          │
│      │ - modules              │                                   │          │
│      │ - entities             │                                   │          │
│      │ - events               │                                   │          │
│      │ - state-machines       │                                   │          │
│      │ - decisions            │                                   │          │
├──────┴───────────────────────┴───────────────────────────────────┴──────────┤
│ Diagnostics panel: errors/warnings/info | filters | selected issue context   │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Top bar

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ BehavioML Explorer | <archive/model root> | Health: 0 errors | Search... | Load│
└──────────────────────────────────────────────────────────────────────────────┘
```

The top bar should provide persistent orientation, not detailed reporting.

## Activity bar

```text
┌──────┐
│ Home │  Overview and workspace orientation
│ Tree │  Entity browsing
│ Src  │  Source-oriented navigation
│ Dia  │  Diagrams, when available
│ Warn │  Diagnostics
│ Find │  Search
└──────┘
```

The activity bar switches work modes while preserving the loaded workspace.

## Explorer tree

```text
┌───────────────────────┐
│ Explorer              │
│ ▾ workflows        12 │
│   checkout-flow       │
│   onboarding-flow     │
│ ▾ roles             5 │
│   customer            │
│   support-agent       │
│ ▸ capabilities     18 │
│ ▸ interfaces        4 │
│ ▸ components        7 │
│ ▸ modules           3 │
│ ▸ entities          9 │
│ ▸ events            6 │
│ ▸ state-machines    2 │
│ ▸ decisions         4 │
└───────────────────────┘
```

Scope grouping should remain primary because users are exploring a BehavioML model, not just folders.

## Workspace tabs

```text
┌───────────────────────────────────────────────────────────────┐
│ Overview | checkout-flow | customer.yaml | Diagnostics | Search │
└───────────────────────────────────────────────────────────────┘
```

Tabs preserve investigation threads such as overview, selected entities, source files, diagnostics, search results, and future diagrams.

## Source view with inspector

```text
┌───────────────────────────────────────────────┬──────────────────────────────┐
│ Source: workflows/checkout-flow.yaml          │ Inspector                    │
├───────────────────────────────────────────────┤                              │
│ 1  id: checkout-flow                          │ Selected entity              │
│ 2  steps:                                     │ Scope: workflows             │
│ 3    - from: customer                         │ Source path                  │
│ 4      capability: submit-order               │ Diagnostics for selection    │
│                                               │ Relationship hints           │
│ Read-only source content remains central.     │ Metadata and notes           │
└───────────────────────────────────────────────┴──────────────────────────────┘
```

Source is a primary surface. The inspector explains source context without replacing the source view.

## Diagram placeholder

```text
┌───────────────────────────────────────────────┬──────────────────────────────┐
│ Diagram: checkout-flow                        │ Inspector                    │
├───────────────────────────────────────────────┤                              │
│                                               │ Selected node/edge           │
│        [customer] ── submit-order ──▶ [system]│ Related entity               │
│             │                                 │ Source location              │
│             └── payment-event ─────────────▶  │ Diagnostics                  │
│                                               │ Relationships                │
└───────────────────────────────────────────────┴──────────────────────────────┘
```

Future diagrams should live in the main workspace as first-class navigation surfaces. Diagram nodes and edges should connect back to source and model relationships.

## Relationships view

```text
┌───────────────────────────────────────────────┬──────────────────────────────┐
│ Relationships: checkout-flow                  │ Inspector                    │
├───────────────────────────────────────────────┤                              │
│ Outgoing references                           │ Active relationship          │
│ - role: customer                              │ Source field/path            │
│ - capability: submit-order                    │ Resolution status            │
│ - event: payment-event                        │ Diagnostics                  │
│                                               │                              │
│ Backlinks                                     │                              │
│ - referenced by generated diagram             │                              │
│ - referenced by review workflow               │                              │
└───────────────────────────────────────────────┴──────────────────────────────┘
```

Relationships are primary because they make the model navigable.

## Diagnostics panel

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Diagnostics | Errors 2 | Warnings 4 | Info 1 | Filter by scope/file/entity   │
├──────────────────────────────────────────────────────────────────────────────┤
│ error   workflows/checkout-flow.yaml   unresolved capability submit-order    │
│ warning roles/customer.yaml            missing description                   │
│ info    components/payment.yaml        generated artifact not found          │
└──────────────────────────────────────────────────────────────────────────────┘
```

Diagnostics should support review and navigation. Selecting a diagnostic should focus the affected source or entity when possible.

## Future diagram placement

Diagram navigation belongs in the main workspace, not in the inspector or as a generated-report appendix.

Expected placement:

- overview can summarize diagram availability;
- activity bar can expose a diagram mode;
- workspace tabs can hold one or more diagram views;
- explorer tree or relationship views can open relevant diagrams;
- inspector can show selected diagram-node or edge metadata;
- diagnostics panel can navigate to diagram context only when a reliable relationship exists.
