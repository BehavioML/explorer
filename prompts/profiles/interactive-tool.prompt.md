# interactive-tool

## Purpose

Reusable BehavioML modeling guidance for interactive tools.

Use this profile with generic command prompts such as `prompts/commands/behavioml.derive.prompt.md` or `prompts/commands/behavioml.review.prompt.md` when the source artifacts describe a tool whose users inspect, navigate, validate, review, or operate domain objects through an interactive experience.

This profile is not specific to the Model Explorer. It should also apply to admin consoles, review tools, dashboards, inspectors, IDE-like tools, debuggers, protocol inspectors, trace viewers, workflow visualizers, and similar products.

## Scope

This profile helps distinguish legitimate interactive behavior from presentation or framework detail.

It should be applied after the generic BehavioML rules and before feature-specific source facts.

## Model semantic user actions

Interactive tools often have behaviorally meaningful user actions.

These may be modeled when justified by source artifacts:

- selecting a domain object or semantic target;
- following a semantic reference or relationship;
- opening source material for precision, trust, or review;
- running validation, checks, analysis, or refresh operations;
- inspecting diagnostics, warnings, findings, or review metadata;
- opening generated or supporting artifacts as context;
- navigating from a diagnostic, finding, result, or artifact to the affected domain object;
- preserving review or navigation context when that behavior is a product requirement.

Prefer modeling these as workflows and capabilities.

Use events only when the occurrence matters beyond labeling a step.

## Do not model presentation mechanics

Do not model:

- widgets;
- component trees;
- visual layout containers;
- visual styling;
- tabs as implementation widgets;
- panels as implementation widgets;
- hover state;
- focus state;
- expanded/collapsed state;
- active-tab state;
- scroll position;
- low-level click handlers;
- framework state;
- route implementation details;
- local view-model or DTO structures.

If a source artifact uses product words such as "view", "panel", "tab", "screen", or "page", translate them into behaviorally meaningful responsibilities only when they affect domain understanding, review, navigation, validation, or operation.

## Events in interactive tools

Valid event candidates may include observable semantic occurrences such as:

- a domain object was selected;
- a semantic reference was followed;
- validation was requested;
- diagnostics were refreshed;
- an artifact was opened for review;
- a source location was opened for inspection;
- a review context was restored.

Doubtful event candidates include:

- a view changed;
- a tab became active;
- a panel was expanded;
- a row was highlighted;
- a button was clicked;
- a filter changed;
- a result was displayed.

Invalid event candidates include pure presentation or framework states such as:

- hover started;
- focus changed;
- component mounted;
- modal opened as a widget implementation detail;
- CSS class changed;
- route changed without a domain-level navigation occurrence.

When unsure, model the user action as a workflow step and capability, but do not create a separate event.

## State machines in interactive tools

Interactive source artifacts often describe product states or information architecture states.

Do not automatically convert those states into BehavioML state machines.

A state machine is appropriate only when it constrains the lifecycle of one coherent behaviorally relevant entity, such as:

- a loaded resource;
- a workspace or review context;
- a validation run;
- an analysis job;
- an import session;
- a domain object under review.

Avoid state machines that mix unrelated concerns such as:

- input loading;
- indexing;
- validation;
- navigation context;
- presentation mode;
- error display;
- framework state.

If the source material mixes these concerns, split lifecycle candidates or report a modeling uncertainty.

## Capability granularity in interactive tools

Interactive tools can easily produce too many tiny capabilities.

Create a capability when it represents a responsibility that is at least one of:

- reusable across workflows;
- assignable to a role, component, module, or boundary;
- required by an interface;
- observable in a meaningful workflow;
- important for validation, review, traceability, or diagnostics;
- necessary to explain architecture or responsibility ownership.

Avoid capabilities that only label micro-actions, widget actions, or presentation mechanics.

Examples of likely useful capabilities:

- load resource;
- detect workspace/root/context;
- index domain objects;
- resolve semantic references;
- run validation;
- show diagnostics in domain context;
- navigate to a semantic target;
- open source for inspection;
- preserve review context when required by product behavior.

Examples of usually too-small capabilities:

- click button;
- activate tab;
- expand panel;
- highlight row;
- render card;
- toggle drawer;
- update component state.

## Entities in interactive tools

Entities should be behaviorally relevant state owners or domain concepts.

Good candidates may include:

- loaded workspace/resource/context;
- semantic domain object being inspected;
- diagnostic/finding when it has domain review behavior;
- generated/supporting artifact when it participates in navigation or review;
- validation run or analysis job when lifecycle matters.

Avoid entities for:

- result rows;
- cards;
- widgets;
- view models;
- routes;
- temporary selections;
- filters unless they are domain-significant;
- every file or DTO.

## Components and adapters

Interactive tools often have presentation adapters, input adapters, or integration adapters.

A component may represent a high-level adapter or boundary if source artifacts justify it architecturally.

Do not make the presentation adapter the owner of domain semantics unless the source explicitly says so.

Prefer assigning semantic responsibilities to a core/domain/application boundary and leaving presentation components as adapters.

If a component exists only to document a replaceable boundary and implements no semantic capability, either omit implementation fields or report a modeling uncertainty if the current schema makes that awkward.

## Review checklist

When deriving or reviewing an interactive-tool model, check:

- Are workflows modeling domain/tool behavior rather than widget flow?
- Are semantic user actions represented without low-level event noise?
- Are events true observable occurrences rather than presentation states?
- Are state machines constrained to coherent lifecycle-bearing entities?
- Are tiny capabilities adding responsibility clarity, or just naming clicks/views?
- Are presentation adapters prevented from owning domain semantics?
- Are generated/supporting artifacts kept distinct from source model content?
- Are navigation and context-preservation requirements modeled only where product-significant?

## Acceptance criteria

- The model captures behaviorally meaningful interactive tool behavior.
- The model does not describe presentation mechanics, visual layout, or framework internals.
- Events are not created for trivial selections, widget changes, or presentation states.
- State machines do not blindly mirror information architecture or product status lists.
- Capabilities are not a flat catalog of micro-actions.
- Components/adapters preserve clear semantic ownership boundaries.
