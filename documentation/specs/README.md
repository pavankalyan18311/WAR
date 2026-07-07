# Specs Workflow

Use this folder as the source of truth before implementation.

## How to use

1. Copy `SPEC_TEMPLATE.md` into a new file, for example `feature-user-profile.md`.
2. Fill all sections.
3. Ask Claude to implement using the spec file.

## Prompt to start implementation

Use this prompt when beginning work:

Implement the feature from `documentation/specs/<your-spec-file>.md`.
Follow the mandatory workflow from `frontend/AGENTS.md` and `CLAUDE.md`.
Do strict TDD in small steps:
1) failing test,
2) minimal implementation,
3) safe refactor.
After each step stop, explain what changed, suggest a commit message, and ask for confirmation.
Never skip tests or jump to full solution.
