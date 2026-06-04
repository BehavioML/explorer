# Model Explorer Research

## Status

Placeholder research document.

No framework, runtime, storage mechanism, distribution model, or implementation architecture has been selected. Research should start only after the source spec and BehavioML draft clarify the behavior that must be supported.

## Decisions to research later

- Workspace discovery strategy for accepted root models and feature-local drafts.
- Validator output format and report ingestion shape.
- Generated diagram artifact format and discovery rules.
- Traceability mapping format and coverage reporting needs.
- Read-only source YAML opening strategy.
- Navigation index representation for references and backlinks.
- Runtime, deployment, and packaging options.

## Candidate decision records

Potential future records may cover:

- accepted model root support: `behavioml/model/` versus generic `model/` roots;
- feature-local draft support in `specs/<feature>/behavioml-draft/model/`;
- diagram format support and Mermaid conventions;
- validator report schema;
- traceability source-map schema;
- application runtime and framework selection when ready.

## Alternatives to evaluate

Do not choose among these yet:

- web application versus desktop application versus CLI-assisted viewer;
- local filesystem access strategies;
- generated static site versus interactive explorer;
- direct YAML parsing versus consuming generated indexes;
- external traceability maps versus future model-local traceability fields;
- framework-specific UI implementation options.

## Notes

Research must not hide behavior that belongs in the source spec or BehavioML model. If research discovers a missing workflow, event, capability, state lifecycle, or decision, classify it as a source spec gap or modeling gap before turning it into technical planning content.
