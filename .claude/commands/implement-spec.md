# Implement From Spec (TDD)

Use this command when user asks to implement a feature from a specification.

## Input

- Required: spec file path under `documentation/specs/`

## Execution Rules

1. Read `CLAUDE.md` and `frontend/AGENTS.md` first.
2. Read the provided spec file completely.
3. If spec is ambiguous, ask clarifying questions before coding.
4. Follow strict TDD for every logical change:
   - Write failing test.
   - Implement minimal code to pass.
   - Refactor safely.
5. Work in very small increments only.
6. After each increment, stop and provide:
   - Step description
   - Test code (failing first)
   - Minimal implementation (only after approval)
   - Refactor (if applicable)
   - Suggested commit message
7. Ask for confirmation before continuing to the next increment.
8. Keep code simple, readable, and maintainable.
9. Respect clean architecture and separation of concerns.
10. Do not generate full solution in one pass.

## Output Contract (Per Step)

1. Step description
2. Test code (failing first)
3. Minimal implementation (only after approval)
4. Refactor (if applicable)
5. Suggested commit message
