# Spec Kit Compatibility Strategy

## Current status

This repository does not currently use the Spec Kit CLI.

It intentionally uses Spec Kit-inspired artifacts such as `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, and `tasks.md` so the BehavioML Model Explorer experiment can remain ChatGPT/Codex-native while preserving a path toward future Spec Kit compatibility.

There should be no `.specify/` directory in this repository at level 0. Running real Spec Kit commands through Codex should be treated as a separate experiment, not as part of this scaffold.

## Why use Spec Kit-inspired artifacts now?

The artifact shape helps keep responsibilities separate:

- source specs own product intent and acceptance criteria;
- BehavioML drafts own proposed behavior-first model content;
- accepted BehavioML model content owns reviewed behavioral architecture;
- traceability maps connect source material to model elements externally;
- generated artifacts own derived diagrams, validation output, and reports;
- plans, research, contracts, data models, and tasks own future implementation planning;
- prompts own repeatable ChatGPT/Codex collaboration instructions.

## Command-shaped prompts

BehavioML command-shaped prompts under `prompts/commands/` define future command contracts without installing a command system.

The current prompt set is intentionally shaped like possible future Spec Kit extension commands:

- `/behavioml.derive`
- `/behavioml.validate`
- `/behavioml.review`
- `/behavioml.diagrams`
- `/behavioml.traceability`
- `/behavioml.promote`

At level 0 these are Markdown prompts, not executable commands.

## Future Level 1

Level 1 may add local reusable command wrappers or prompt workflows. These could make the command-shaped prompts easier to invoke consistently, but they should still avoid packaging a reusable extension until the semantics are proven.

Level 1 should still keep the Explorer uncoupled from Spec Kit internals.

## Future Level 2

Level 2 may package these workflows as a real Spec Kit extension or tooling package. A level-2 integration may include packaged command templates, validator/generator scripts, traceability coverage tooling, and optional hooks into Spec Kit phases.

Level 2 should happen only after the command semantics stabilize through repeated level-0 and level-1 use.

## Separate experiment: real Spec Kit execution

Executing real Spec Kit commands via Codex, running `specify init`, adding `.specify/`, or testing extension hooks should be handled as a separate explicit experiment.

That experiment should define its own acceptance criteria and rollback expectations before changing this repository.

## Coupling guidance

Avoid coupling the Explorer to Spec Kit until the BehavioML command semantics stabilize.

The Explorer should remain a BehavioML model explorer first. Spec Kit compatibility should be layered around source specs, planning artifacts, prompt workflows, traceability, and generated reports rather than embedded prematurely into Explorer application architecture or BehavioML metamodel rules.
