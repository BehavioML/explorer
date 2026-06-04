# Accepted BehavioML Workspace

This directory is reserved for the accepted system-level BehavioML workspace for the future Model Explorer.

## Directory roles

- `behavioml/model/` is the accepted behavioral source model.
- `behavioml/traceability/` contains optional external source links.
- `behavioml/generated/` contains generated diagrams, validation output, and reports.

## Rules

- Feature-local drafts under `specs/<feature>/behavioml-draft/` should be reviewed before promotion here.
- Accepted model content should remain behavior-first.
- The accepted model should describe workflows, roles, capabilities, interfaces, components, modules, events, entities, state machines, and decisions when they are behaviorally relevant.
- Generated artifacts should not be edited by hand.
- Traceability is experimental and external for now; it should not require BehavioML metamodel changes.
- Implementation guidance, technical contracts, code tasks, framework choices, and runtime details belong outside the accepted behavior model.
