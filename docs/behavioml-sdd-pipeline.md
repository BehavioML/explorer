# BehavioML in a Level-0 SDD Pipeline

## Summary thesis

BehavioML should sit between source specifications and implementation planning as a behavior-first model layer. Source specs describe product intent and acceptance expectations. BehavioML makes workflows, roles, capabilities, events, state, responsibilities, and decisions explicit. Technical plans, contracts, tasks, and implementation then use both the source specs and the reviewed BehavioML model without inventing behavior.

```text
source spec
        -> feature-local BehavioML draft
        -> validation/review
        -> generated diagrams/reports
        -> promotion into accepted BehavioML model
        -> technical planning / contracts / tasks / implementation
```

## Directory ownership

| Directory or artifact | Owns | Does not own |
| --- | --- | --- |
| `specs/<feature>/spec.md` | Source product specification, goals, non-goals, users, scenarios, functional requirements, acceptance criteria, constraints, open questions | BehavioML source model, technical contracts, implementation tasks |
| `specs/<feature>/behavioml-draft/model/` | Feature-local proposed BehavioML model elements derived from source specs | Accepted system model, UI layout, framework choices, implementation tasks |
| `specs/<feature>/behavioml-draft/traceability/` | Experimental external mappings from source spec anchors to proposed model elements | BehavioML metamodel fields, source requirements, model content |
| `specs/<feature>/behavioml-draft/generated/` | Derived diagrams, validation output, and reports for a feature-local draft | Source-of-truth model content |
| `behavioml/model/` | Accepted system-level behavior-first model | Source spec prose, contracts, tasks, generated artifacts, framework decisions |
| `behavioml/traceability/` | Optional external links from source specs to accepted model elements | Core BehavioML semantics or metamodel changes |
| `behavioml/generated/` | Generated diagrams, validation output, and reports for the accepted model | Source-of-truth model content |
| Future Spec Kit plan/research artifacts | Technical context, implementation strategy, project structure, runtime choices, unresolved technical decisions | Missing behavior absent from source specs or BehavioML |
| Future contracts | API schemas, command schemas, endpoint contracts, payloads, message schemas | Behavioral source of truth |
| Future tasks | Ordered implementation work and file-level decomposition | BehavioML semantics or product requirements |

## Root model versus feature-local draft

Feature-local drafts and the accepted system model have different responsibilities.

`specs/<feature>/behavioml-draft/model/` is a review space for proposed model content derived from that feature's source specification. It is useful while the feature is still being clarified and before model changes are accepted.

`behavioml/model/` is the accepted system-level BehavioML model. Content should be promoted here only after review. This avoids multiple divergent system models while still allowing feature-oriented source specs and drafts.

## Level 0

Level 0 is the current repository scaffold:

- repository conventions;
- manual prompts and human review;
- documentation;
- no Spec Kit extension;
- no code.

Level 0 tests whether the separation of source specs, BehavioML drafts, accepted model content, traceability, generated artifacts, and implementation planning is understandable before automation is introduced.

## Level 1

Level 1 would add local Spec Kit-style commands or prompt templates, such as:

- `/behavioml.derive`;
- `/behavioml.review`;
- `/behavioml.validate`.

Level 1 would still be mostly prompt/template based and would not require a reusable package.

## Level 2

Level 2 would add a reusable Spec Kit extension with packaged commands and templates. It may also include scripts that invoke a BehavioML validator or generator, plus traceability and coverage tooling.

## What is not automated yet

- Deriving a BehavioML draft from a source spec.
- Validating references, event discipline, state machines, or diagrammability.
- Generating Mermaid diagrams or reports.
- Checking traceability coverage.
- Promoting reviewed draft content into the accepted model.
- Producing technical plans, contracts, or tasks from the reviewed model.
- Enforcing any repository convention through scripts or hooks.

## Gap classification

| Gap type | Meaning | Fix |
| --- | --- | --- |
| Source spec gap | Product requirement, user scenario, acceptance criterion, assumption, or constraint is unclear or missing. | Update the source spec or related SDD artifact. |
| Modeling gap | Behavior required for correctness is missing, ambiguous, duplicated, hidden in implementation notes, or not behavior-first in BehavioML. | Update the BehavioML draft or accepted model. |
| Technical planning gap | Behavior is specified and modeled, but implementation choices are missing. | Update future plan or research artifacts. |
| Contract gap | A behavior or interface boundary exists, but payloads, routes, schemas, commands, or protocol details are missing. | Update future contract artifacts. |
| Task gap | Implementation work exists conceptually but has not been decomposed into executable tasks. | Update future task artifacts. |
| Out of scope | A detail is intentionally excluded from the current feature, model, plan, contract, or task set. | Document the exclusion and do not implement it. |

## Rules

- BehavioML does not replace source specs.
- Source specs do not replace BehavioML.
- Contracts do not replace BehavioML interfaces or capabilities.
- Generated diagrams are not source of truth.
- Implementation must not invent behavior absent from specs or the model.
- Traceability is external and experimental for now.
- BehavioML metamodel changes should not be proposed until experiments justify them.
- A missing implementation detail should be reported as a planning, contract, or task gap instead of being hidden in the model.
- A missing behavior should be reported as a source spec gap or modeling gap instead of being invented during implementation.
