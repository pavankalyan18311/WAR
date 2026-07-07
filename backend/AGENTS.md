# Backend Ways Of Working (Mandatory)

These rules apply to all backend implementation tasks.

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

## Backend Testing Expectations

- Prefer `pytest` tests for service logic and API routes.
- Add or update tests close to the changed backend module.
- Validate error handling and edge cases in tests.
- Keep API contract behavior stable unless the spec explicitly changes it.

## Required Output Format Per Step

1. Step description
2. Test code (failing first)
3. Minimal implementation (only after approval)
4. Refactor (if applicable)
5. Suggested commit message
