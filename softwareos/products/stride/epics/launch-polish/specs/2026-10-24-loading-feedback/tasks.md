# Tasks: Loading Feedback

> Epic: launch-polish
> Spec: 2026-10-24-loading-feedback
> Branch: feat/launch-polish/loading-feedback

Ships as four PRs. Each code PR lands when develop has the code it edits; the demo-branch diff is the reference.
- **PR 0** = T1: docs, merged to develop first
- **PR 1** = T2–T7: the shared Spinner and Button `loading`, the login/sign-up button and /account. Develop has all of it today.
- **PR 2** = T8–T10: /account/security. Waits for session-management's web PR (#48).
- **PR 3** = T11–T14: /catalog. Waits for product-catalog's code on develop.

The canonical branch takes `--pr<n>` suffixes per code PR (git-workflow: parallel work on one spec).

## PR 0 — docs

- [ ] T1 Open the docs PR: this spec folder, the launch-polish epic.md Specs row and specs.index.yml. Merge to develop before PR 1 (pr skill).

## PR 1 — shared spinner (ready now)

- [ ] T2 Add `apps/web/src/components/ui/Spinner.tsx` (`Spinner`, `SpinnerBlock`). (AC1)
- [ ] T3 Add the `loading` prop to `apps/web/src/components/ui/Button.tsx`. (AC2)
- [ ] T4 Use `loading={pending}` in `apps/web/src/features/auth/SubmitButton.tsx` (login and sign-up). (AC3)
- [ ] T5 Add the SpinnerBlock fallback to `apps/web/src/app/account/page.tsx`. (AC5)
- [ ] T6 Write `Spinner.test.tsx` and the Button `loading` tests (testing skill), each file starting with `// covers AC…, T6`. (AC1, AC2)
- [ ] T7 Run lint, typecheck, `npm test` and build. Open PR 1 (pr skill).

## PR 2 — /account/security (after #48)

- [ ] T8 Use `loading={pending}` in `features/account-security/ChangePasswordForm.tsx` and `features/account-security/SignOutOthersButton.tsx`. (AC3)
- [ ] T9 Add the SpinnerBlock fallback to `apps/web/src/app/account/security/page.tsx`. (AC5)
- [ ] T10 Run lint, typecheck and `npm test` (the account-security tests still pass). Open PR 2 (pr skill).

## PR 3 — /catalog (after product-catalog's code)

- [ ] T11 Add `apps/web/src/features/catalog/catalog-navigation.tsx`, wire it through `CatalogView.tsx`, `FilterForm.tsx` and `SortSelect.tsx`. Check 375px and 1280px. (AC4)
- [ ] T12 Write `catalog-navigation.test.tsx` (testing skill, `// covers AC4, T12`): `CatalogResultsBusy` is busy and labeled while pending, and not when idle. The existing FilterForm/SortSelect tests still pass. (AC4)
- [ ] T13 Run lint, typecheck, `npm test` and build. Open PR 3 (pr skill).

## Verification

- [ ] T14 Run the qa skill against AC1–AC6 once PR 3 is on develop, and write `qa-report.md`. (AC1–AC6)
