# Email OTP Only Registration

## 1. Feature Name

Email OTP only registration (no mobile OTP)

## 2. Problem Statement

Mobile OTP currently introduces DLT template dependencies and registration friction. We need a registration flow that verifies email via OTP and then allows normal password login without OTP.

## 3. Scope

### In scope
- Registration flow based on details + email OTP verification.
- Remove mandatory mobile OTP from registration UX.
- Keep standard username/email + password login without OTP.
- Resend email OTP support.
- Backend and frontend changes required by above behavior.

### Out of scope
- Mobile OTP and MSG91-based verification.
- MFA during login.

## 4. Functional Requirements

1. New users submit registration details first.
2. System sends a 6-digit OTP to email using Resend integration path.
3. Account is created only after correct OTP verification.
4. Invalid/expired OTP blocks account creation and shows actionable error.
5. User can request resend OTP.
6. Existing verified users login with username/email and password only (no OTP).

## 5. Non-Functional Requirements

- Performance: OTP send/verify should be responsive for normal dev/test usage.
- Security: account must not be created/activated before OTP verification.
- Reliability: resend path should recover from expired OTP.
- Accessibility: registration and OTP forms should remain keyboard accessible.

## 6. API / Data Contract Changes

- Remove dependency on mobile OTP verification in frontend registration flow.
- Preserve backend register/login contracts unless explicitly changed.
- DB/schema changes only if needed to support email-only registration.

## 7. Architecture Constraints

- Keep clean separation between UI flow orchestration and API calls.
- Avoid introducing unrelated auth architecture changes.
- Keep login path password-based without OTP.

## 8. Test Requirements (Mandatory)

- Unit tests for auth flow transitions.
- Integration tests for backend register/login behavior as impacted.
- Manual test for resend OTP in registration flow.
- Edge cases: wrong OTP, expired OTP, duplicate email.

## 9. Acceptance Criteria

1. AC1 – Email OTP Verification During Registration
   - Given a new user submits registration details,
   - When registration is initiated,
   - Then a 6-digit OTP is sent to registered email using Resend,
   - And account remains unverified/uncreated until OTP verification succeeds.

2. AC2 – Successful Account Creation
   - Given user enters correct OTP within expiry,
   - When verification is completed,
   - Then account is created successfully,
   - And email is marked verified,
   - And user is logged in automatically.

3. AC3 – Invalid or Expired OTP Handling
   - Given user enters incorrect or expired OTP,
   - When verification is attempted,
   - Then account creation does not complete,
   - And appropriate error appears,
   - And user can request a new OTP.

4. AC4 – Password-Based Login
   - Given user has a verified account,
   - When valid username/email + password is provided,
   - Then login succeeds,
   - And OTP is not required during standard login.

## 10. Rollout / Risks

- Risks: existing mobile-OTP-specific UI logic may conflict with email-only path.
- Mitigations: stepwise TDD updates and flow-state tests.
- Rollback: keep changes isolated to auth flow/state and route handlers.

## 11. Implementation Notes

Start with smallest slice: remove mobile OTP gate from registration flow while preserving existing login behavior.
