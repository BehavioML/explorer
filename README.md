# BehavioML Model Explorer

This repository is the future home of the BehavioML Model Explorer.

It is currently being used as a level-0 experiment for a Spec Kit -> BehavioML -> implementation planning workflow. The purpose of this repository today is to test workspace conventions and documentation boundaries before any Explorer application or reusable Spec Kit integration exists.

## Current status

- This repository contains documentation and scaffold directories only.
- No application code exists yet.
- No implementation framework has been chosen yet.
- No package manager, runtime dependency, or `package.json` has been added.
- No real Spec Kit extension has been created yet.
- No BehavioML metamodel changes are proposed here.

## Workspace conventions

- Source specs live under `specs/`.
- Feature-local BehavioML drafts live under `specs/<feature>/behavioml-draft/`.
- The accepted system-level BehavioML model lives under `behavioml/model/`.
- Generated diagrams, validation output, and reports live under `generated/` directories.
- Traceability is external for now and may live under `traceability/` directories.

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
