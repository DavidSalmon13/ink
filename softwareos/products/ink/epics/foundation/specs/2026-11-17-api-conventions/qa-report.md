# QA Report — API Conventions

> Spec: spec.md
> Date: 2026-11-17 · QA by: david-schwartzman · Mode: setup
> Verdict: PASS WITH NOTES

Run on `feat/foundation/api-conventions--t11` (top of the stacked branches; contains T1–T11).

## Acceptance Criteria

| AC | Criterion | Result | Evidence |
|---|---|---|---|
| AC1 | Shared synced-entity base (client UUID, server timestamps, deletedAt, version), used by Settings and Attachment | pass | `common/SyncedEntity.java` (`@MappedSuperclass`, `@PrePersist`/`@PreUpdate`, `@Version`); `Settings extends SyncedEntity` (settings/Settings.java:18), `Attachment extends SyncedEntity` (attachment/Attachment.java:17); `putCreatesTheRecordAndReturnsA15MinuteUploadUrl` asserts id/version/createdAt/updatedAt |
| AC2 | Retry-safe PUT: identical retry → 200, same record, no version bump, no duplicates | pass | `SettingsIT.identicalRetryIs200NoOp`, `AttachmentIT.identicalRetryIs200WithTheSameRecordAndNoDuplicate` |
| AC3 | Optimistic locking: stale version → 409 `version_conflict` + `details.current`; match → save + increment | pass | `SettingsIT.putWithCurrentVersionSavesAndBumpsVersion`, `SettingsIT.staleVersionIs409VersionConflictWithCurrentRecord` |
| AC4 | Soft delete → 204 (also repeated), deleted reads 404, no hard deletes | pass | `AttachmentIT.deleteSoftDeletesRepeatsAs204AndHidesTheRecord` (row kept, `deleted_at` set); grep of `apps/api/src/main` finds no `delete(`/`deleteById`/`em.remove`/`DELETE FROM` |
| AC5 | One error body `{"error": {code, message, details?}}` with stable codes; 500 leaks nothing; login unchanged | pass | `ErrorFormatIT` (not_found, bad_request, validation_failed + `details.fields`, internal_error without secret/request value/stack); `AttachmentIT` (unsupported_media_type, payload_too_large); `AuthIT` (23) and `LoginRateLimitIT` (7) unchanged and green |
| AC6 | Single Settings row seeded with data-model defaults; GET/PUT under AC2/AC3; agorot ≥ 0 | pass | `SettingsIT.getReturnsTheSeededDefaults`, `thereIsExactlyOneSettingsRow`, `negativeAgorotIsValidationFailed`; DB checks in `V3__settings.sql` |
| AC7 | Attachments: PUT creates + 15-min upload URL; download-url 15-min; DELETE soft-deletes; private bucket | pass | `AttachmentIT.putCreatesTheRecordAndReturnsA15MinuteUploadUrl` (`X-Amz-Expires=900`), `bytesPutToTheUploadUrlComeBackThroughTheDownloadUrl` (real round trip via S3Mock), kind/type/size rejections. Private bucket: by inspection, the API only issues presigned URLs (`attachment/StorageService.java`); S3Mock doesn't enforce auth, so "no public access" is enforced by R2 bucket config at deploy time |
| AC8 | Local S3Mock (pinned tag) in docker-compose, bucket created on start; env-driven endpoint/bucket/keys | pass | `docker-compose.yml` `adobe/s3mock:4.12.4` with `initialBuckets`; observed `docker compose up -d s3mock` listing `<Name>ink-attachments</Name>`; `application.yml` `app.storage.*` from `STORAGE_*`; `.env.example` placeholders only |
| AC9 | New endpoints require a Bearer session, else 401 `unauthorized` | pass | `ErrorFormatIT.newEndpointsWithoutTokenAre401Unauthorized` (all five endpoints), `AttachmentIT.withoutATokenIs401Unauthorized` |
| AC10 | Mobile `ApiError` exposes code/message/details; typed settings + attachments helpers | pass | `__tests__/api/client.test.ts` (details), `__tests__/api/settings.test.ts`, `__tests__/api/attachments.test.ts` (upload PUT has no Authorization header) |
| AC11 | `./gradlew build` incl. Testcontainers ITs; mobile typecheck/lint/test; CI green | pass | Local: all pass (below). CI: green on `main` at `6deffd6` (all of T1–T11 plus the SettingsIT timestamp fix) — added at close-out, 2026-11-18 |

## Checks Run

- build + tests (API): `./gradlew build` in `apps/api` — pass (70 tests, 0 failed: HealthIT 3, AttachmentIT 9, AuthIT 23, HashPasswordCliTest 3, LoginRateLimitIT 7, OwnerSeederIT 6, SessionTokenServiceTest 8, ErrorFormatIT 5, SettingsIT 6)
- lint (mobile): `npm run lint` — pass
- typecheck (mobile): `npm run typecheck` — pass
- tests (mobile): `npx jest` — pass (18 suites, 115 tests)

## Issues Found

(none)

## Notes

- **AC11 CI (resolved 2026-11-18):** CI is green on `main` at `6deffd6`. Original note: confirm green CI on the PRs for `--t3` … `--t11` once pushed. The intermediate stacked PRs (#47 and the T3 branch) carry intentionally red tests, so their CI fails until the implementation PRs on top of them land; only the top of the stack should be expected green.
- **Hygiene:** T12 (this QA) is the only open task. `> PR:` records #46 and #47; branches `--t3`, `--t4-t5`, `--t6-t7`, `--t8`, `--t9-t10`, `--t11` are local and have no PRs yet. Spec `> Status: in-progress` matches.
- **Decisions made in implementation, not spelled out in the spec** (worth a reviewer's look):
  - Response fields `uploadUrl` / `downloadUrl`.
  - Bad type → 415 `unsupported_media_type`; too large → 413 `payload_too_large`; unknown kind → `validation_failed`.
  - 15 MB = 15 × 1024 × 1024 bytes.
  - Upload URLs sign content type and length.
  - DELETE of an unknown id → 204 no-op; writing to a soft-deleted record → 404.
  - Login validation keeps 400 `bad_request`, via a check on `AuthController` in `GlobalExceptionHandler`.
  - `estimateTables` shape: `{sizeBaseMinutes, detail, shading, placement}`.
  - `calibrationPoints` shape: `[{label, minutes}]`.
- The Gradle run reused up-to-date results from the earlier full run on the same API code; mobile changes (T11) don't affect it.
