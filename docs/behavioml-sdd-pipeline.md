# BehavioML in a Level-0 SDD Pipeline

## Summary thesis

BehavioML should sit between source specifications and implementation planning as a behavior-first model layer. Source specs describe product intent and acceptance expectations. BehavioML makes workflows, roles, capabilities, events, state, responsibilities, and decisions explicit. Technical plans, contracts, tasks, prompts, and implementation then use both the source specs and the reviewed BehavioML model without inventing behavior.

This repository is inspired by Spec Kit's artifact model, but it does not depend on the Spec Kit CLI yet. There should be no `.specify/` directory at level 0. BehavioML command-shaped prompts are first-class project artifacts and are intentionally shaped like future Spec Kit extension commands.

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
| `specs/<feature>/notes.md` | Feature experiment notes, assumptions, unknowns, and level-0 learning goals | Accepted model content, implementation design |
| `specs/<feature>/plan.md` | Future technical context, architecture notes, testing strategy, and open technical decisions | Missing behavior absent from source specs or BehavioML |
| `specs/<feature>/research.md` | Future technical decision research and alternatives | Behavioral or modeling rationale that belongs in BehavioML decisions |
| `specs/<feature>/data-model.md` | Future implementation data entities, schemas, and technical data relationships | BehavioML behaviorally relevant entities or state machines |
| `specs/<feature>/contracts/` | Future API schemas, command schemas, endpoint contracts, payloads, message schemas, or integration contracts | Behavioral source of truth |
| `specs/<feature>/tasks.md` | Future ordered implementation work and file-level decomposition | BehavioML semantics, source requirements, framework selection by stealth |
| `specs/<feature>/prompts/` | Feature-specific Codex prompts | Repo-wide reusable command prompt definitions |
| `specs/<feature>/behavioml-draft/model/` | Feature-local proposed BehavioML model elements derived from source specs | Accepted system model, UI layout, framework choices, implementation tasks |
| `specs/<feature>/behavioml-draft/traceability/` | Experimental external mappings from source spec anchors to proposed model elements | BehavioML metamodel fields, source requirements, model content |
| `specs/<feature>/behavioml-draft/generated/` | Derived diagrams, validation output, and reports for a feature-local draft | Source-of-truth model content |
| `behavioml/model/` | Accepted system-level behavior-first model | Source spec prose, contracts, tasks, generated artifacts, framework decisions |
| `behavioml/traceability/` | Optional external links from source specs to accepted model elements | Core BehavioML semantics or metamodel changes |
| `behavioml/generated/` | Generated diagrams, validation output, and reports for the accepted model | Source-of-truth model content |
| `prompts/` | Repo-wide reusable ChatGPT/Codex prompts | Runtime tooling, hidden requirements, implementation code |
| `prompts/commands/` | Command-shaped BehavioML workflow prompts that may later become Spec Kit extension commands | Real installed commands, hooks, or extension packaging |
| `docs/spec-kit-compatibility.md` | Future compatibility strategy and coupling guidance | Current Spec Kit CLI setup |

## Root model versus feature-local draft

Feature-local drafts and the accepted system model have different responsibilities.

`specs/<feature>/behavioml-draft/model/` is a review space for proposed model content derived from that feature's source specification. It is useful while the feature is still being clarified and before model changes are accepted.

`behavioml/model/` is the accepted system-level BehavioML model. Content should be promoted here only after review. This avoids multiple divergent system models while still allowing feature-oriented source specs and drafts.

## Prompts as first-class artifacts

Prompts are reviewable project artifacts. They should describe inspect-first steps, exact scope, non-goals, acceptance criteria, commands to run where applicable, and honest failure reporting requirements.

Command-shaped prompts under `prompts/commands/` define manual workflow contracts for:

- `/behavioml.derive`;
- `/behavioml.validate`;
- `/behavioml.review`;
- `/behavioml.diagrams`;
- `/behavioml.traceability`;
- `/behavioml.promote`.

At level 0 these prompt files are not executable commands. They are intentionally shaped for future Spec Kit compatibility once their semantics stabilize.

## Level 0

Level 0 is the current repository scaffold:

- repository conventions;
- manual prompts and human review;
- command-shaped prompt files;
- documentation;
- no tooling;
- no Spec Kit CLI dependency;
- no `.specify/` directory;
- no Spec Kit extension;
- no code.

Level 0 tests whether the separation of source specs, BehavioML drafts, accepted model content, traceability, generated artifacts, technical planning artifacts, prompt artifacts, and implementation work is understandable before automation is introduced.

## Level 1

Level 1 would add local reusable commands or prompts, such as wrappers for:

- `/behavioml.derive`;
- `/behavioml.review`;
- `/behavioml.validate`.

Level 1 would still avoid a packaged extension. It may make the command-shaped prompts easier to run consistently, but it should not require coupling the Explorer to Spec Kit internals.

## Level 2

Level 2 would add a reusable Spec Kit extension or tooling package with packaged commands and templates. It may also include scripts that invoke a BehavioML validator or generator, plus traceability and coverage tooling.

Level 2 should happen only after the level-0 and level-1 prompt semantics are stable enough to serve as real command contracts.

## Future Spec Kit compatibility

This repository intentionally uses Spec Kit-inspired artifacts without running `specify init` or adding `.specify/`. The compatible direction is:

```text
Spec Kit-inspired source spec and planning artifacts
        -> BehavioML command-shaped prompts
        -> reviewed BehavioML model and reports
        -> future local wrappers or extension packaging
```

Executing real Spec Kit commands through Codex, adding hooks, or packaging an extension should be treated as a separate experiment with explicit acceptance criteria.

## What is not automated yet

- Deriving a BehavioML draft from a source spec.
- Validating references, event discipline, state machines, or diagrammability.
- Generating Mermaid diagrams or reports.
- Checking traceability coverage.
- Promoting reviewed draft content into the accepted model.
- Producing technical plans, contracts, or tasks from the reviewed model.
- Running command-shaped prompts as installed commands.
- Enforcing any repository convention through scripts or hooks.

## Gap classification

| Gap type | Meaning | Fix |
| --- | --- | --- |
| Source spec gap | Product requirement, user scenario, acceptance criterion, assumption, or constraint is unclear or missing. | Update the source spec or related SDD artifact. |
| Modeling gap | Behavior required for correctness is missing, ambiguous, duplicated, hidden in implementation notes, or not behavior-first in BehavioML. | Update the BehavioML draft or accepted model. |
| Technical planning gap | Behavior is specified and modeled, but implementation choices are missing. | Update `plan.md` or `research.md`. |
| Contract gap | A behavior or interface boundary exists, but payloads, routes, schemas, commands, or protocol details are missing. | Update `contracts/`. |
| Task gap | Implementation work exists conceptually but has not been decomposed into executable tasks. | Update `tasks.md`. |
| Prompt gap | A repeatable ChatGPT/Codex workflow is needed, but the prompt is missing, ambiguous, non-deterministic, or lacks acceptance criteria. | Update repo-wide or feature-specific prompt artifacts. |
| Out of scope | A detail is intentionally excluded from the current feature, model, plan, contract, prompt, or task set. | Document the exclusion and do not implement it. |

## Rules

- BehavioML does not replace source specs.
- Source specs do not replace BehavioML.
- Contracts do not replace BehavioML interfaces or capabilities.
- Prompts do not replace source specs, BehavioML models, contracts, or tasks.
- Generated diagrams are not source of truth.
- Implementation must not invent behavior absent from specs or the model.
- Traceability is external and experimental for now.
- BehavioML metamodel changes should not be proposed until experiments justify them.
- A missing implementation detail should be reported as a planning, contract, prompt, or task gap instead of being hidden in the model.
- A missing behavior should be reported as a source spec gap or modeling gap instead of being invented during implementation.
