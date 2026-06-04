# BehavioML Model Explorer

This repository is the future home of the BehavioML Model Explorer.

It is currently being used as a level-0 ChatGPT/Codex-native experiment for a Spec Kit-inspired SDD -> BehavioML -> implementation planning workflow. The purpose of this repository today is to test workspace conventions, prompt artifacts, and documentation boundaries before any Explorer application, Spec Kit CLI dependency, or reusable Spec Kit extension exists.

## Current status

- This repository contains documentation, prompt artifacts, and scaffold directories only.
- The current integration level is Level 0.
- The artifact model is inspired by Spec Kit, but this repository does not depend on the Spec Kit CLI yet.
- No `.specify/` directory should exist yet.
- No application code exists yet.
- No implementation framework has been chosen yet.
- No package manager, runtime dependency, or `package.json` has been added.
- No real Spec Kit extension has been created yet.
- No BehavioML metamodel changes are proposed here.

## Workspace conventions

- Source specs live under `specs/`.
- Spec Kit-inspired planning artifacts, such as `plan.md`, `research.md`, `data-model.md`, `contracts/`, and `tasks.md`, live under `specs/<feature>/`.
- Feature-local BehavioML drafts live under `specs/<feature>/behavioml-draft/`.
- Accepted system-level BehavioML model content lives under `behavioml/model/`.
- Generated diagrams, validation output, and reports live under `generated/` directories.
- Traceability is external for now and may live under `traceability/` directories.
- Repo-wide reusable prompts live under `prompts/`.
- Command-shaped BehavioML workflow prompts live under `prompts/commands/`.
- Feature-specific prompts live under `specs/<feature>/prompts/`.

## Prompts as first-class artifacts

Prompts are first-class project artifacts for ChatGPT/Codex collaboration. They should be deterministic, reviewable, explicit about non-goals, and honest about failure reporting.

The BehavioML workflow prompts are intentionally shaped like future Spec Kit extension commands:

- `/behavioml.derive`
- `/behavioml.validate`
- `/behavioml.review`
- `/behavioml.diagrams`
- `/behavioml.traceability`
- `/behavioml.promote`

At Level 0, these are plain Markdown prompts, not installed commands.

## Intended pipeline

```text
source specs / SDD artifacts
        -> feature-local BehavioML behavioral model draft
        -> validation, diagrams, traceability, model review
        -> promotion into the accepted BehavioML model
        -> technical planning / contracts / tasks
        -> implementation
```

The Explorer should eventually help users inspect, navigate, validate, and understand BehavioML models. It should not start as a full editor, a requirements management tool, or a framework-specific application.

## Compatibility levels

- Level 0: repository conventions, manual prompts, command-shaped prompt files, docs, and no tooling.
- Level 1: local reusable commands or prompts, still without a packaged extension.
- Level 2: reusable Spec Kit extension or tooling package, potentially invoking BehavioML validator/generator scripts and traceability coverage tooling.

Future Spec Kit compatibility should be added only after the command-shaped prompt semantics stabilize.
