# Prompts

Prompts are first-class project artifacts for ChatGPT/Codex collaboration.

This repository is intentionally level 0: prompts are reviewable files, not installed commands, hooks, or packaged Spec Kit extensions.

## Directory roles

- Repo-wide reusable prompts live here.
- Command-shaped prompts live under `prompts/commands/`.
- Feature-specific prompts live under `specs/<feature>/prompts/`.

## Prompt quality rules

Prompts should be deterministic and reviewable. They should avoid hidden context where possible and should name the files, directories, reports, and reference material that must be inspected before work begins.

Prompts should include:

- purpose and scope;
- explicit inputs and outputs;
- inspect-first steps;
- acceptance criteria;
- explicit non-goals;
- commands to run where applicable;
- honest failure and gap reporting requirements.

## Future Spec Kit compatibility

Command-shaped prompts may later become real Spec Kit extension commands after their semantics stabilize. Until then, they are plain Markdown artifacts for manual ChatGPT/Codex-native workflows and should not require `.specify/`, hooks, a package manager, or a Spec Kit CLI installation.
