# behavioml.diagrams

## Purpose

Generate derived diagram views from a feature-local or accepted BehavioML model.

## Inputs

- Feature-local BehavioML model under `specs/<feature>/behavioml-draft/model/`, or
- Accepted BehavioML model under `behavioml/model/`, or
- Another explicitly supplied BehavioML `model/` root

## Outputs

- Mermaid diagrams under the corresponding `generated/mermaid/` directory
- Summary of generated views and skipped views

## Instructions

1. Inspect the selected model root and relevant validation results before generating diagrams.
2. Generate views only from explicit model content.
3. Use diagrams to show workflows, capabilities, state machines, references, or other requested derived views.
4. Treat diagrams as generated artifacts.
5. Report model gaps that prevent useful diagram generation.

## Non-goals

- Do not treat diagrams as source of truth.
- Do not infer hidden interactions.
- Do not add behavior to make a diagram more complete.
- Do not edit source model files unless explicitly requested.
- Do not choose application implementation details.

## Acceptance criteria

- Diagram files are written under `generated/mermaid/` when generation is requested.
- Diagrams reflect only explicit model content.
- Skipped or incomplete diagrams include clear reasons.
- Source model files remain authoritative.

## Failure reporting

Report missing model roots, unresolved references that block diagrams, unsupported model shapes, and any diagram views that could not be generated safely.
