# Doctor Dashboard Integration & Quality Audit Plan

## Context

The user wants to ensure the doctor dashboard is:
1. Well-integrated with other roles (patient, pharmacist, admin, etc.)
2. Not tightly coupled or hardcoded
3. Follows best practices
4. Thoroughly tested

Then:
5. Create PRs
6. Deploy Oracle agent to audit before commit
7. Have bot account (GH_TOKEN) review PRs

## Audit Scope

### Integration Points to Check:
- Doctor ↔ Patient (medical records view, prescriptions)
- Doctor ↔ Pharmacist (prescription creation → pharmacy sees it)
- Doctor ↔ Appointments (schedule, status updates)
- Doctor ↔ Admin (record deletion is admin-only - verify enforcement)
- Doctor ↔ Billing (invoices generated from appointments)
- Doctor ↔ Departments/Wards (referrals, admissions)

### Tight Coupling / Hardcoding to Hunt:
- Magic strings (API endpoints, statuses, role names)
- Direct imports instead of using endpoints/config
- Hardcoded IDs or role checks
- Single source of truth violations

### Best Practices:
- Use shared constants/endpoints
- Centralized types
- Error handling consistency
- Auth context usage
- API service layer patterns

## Phases

### Phase 1: Integration Audit (explore agent)
- Map all integration points
- Identify missing connections
- Find integration gaps

### Phase 2: Tight Coupling Hunt (explore agent)
- Find hardcoded strings
- Find direct imports vs centralized
- Identify tightly coupled modules

### Phase 3: Fixes (deep agents - parallel)
- Fix integration issues
- Replace hardcoded with constants
- Improve service layer

### Phase 4: Oracle Audit (oracle agent)
- Review code quality
- Check security
- Verify architecture

### Phase 5: PR Creation (github agent)
- Create branches
- Commit changes
- Create PRs with GITHUB_TOKEN

### Phase 6: PR Review (pr-reviewer agent)
- Use GH_TOKEN bot account
- Review PRs
- Provide feedback

## Tokens Used
- gh cli for PR creation
- pr-reviewer agent for PR review
- oracle agent for pre-commit audit