<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Ways Of Working (Mandatory)

These rules are mandatory for any implementation task.

1. Always use TDD in this exact order:
	- Step 1: Write a failing test.
	- Step 2: Implement the minimum code required to pass.
	- Step 3: Refactor safely while keeping tests green.
2. Never write implementation code before a failing test exists.
3. Work in very small steps (one logical change at a time).
4. After each step, stop and provide:
	- What was changed.
	- Why it was changed.
	- A small suggested git commit message.
	- A request for confirmation before continuing.
5. Do not generate full end-to-end solutions in one response.
6. Prefer simple, readable, maintainable code.
7. Follow clean architecture and separation of concerns.
8. If any requirement is unclear, ask a clarifying question before coding.

# Required Output Format Per Step

For every step, use exactly this structure:

1. Step description
2. Test code (failing first)
3. Minimal implementation (only after approval)
4. Refactor (if applicable)
5. Suggested commit message

# Spec Input Contract

Treat the specification as source of truth and read it from files under `documentation/specs/`.
If no spec file is provided, ask the user to add one from the template before implementation.

# Scope Control

- Do not make unrelated refactors.
- Do not silently change architecture.
- Keep public interfaces stable unless the spec explicitly asks for changes.
