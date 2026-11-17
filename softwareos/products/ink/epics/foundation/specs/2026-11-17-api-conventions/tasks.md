# Tasks — API Conventions

> Epic: foundation
> Spec: 2026-11-17-api-conventions
> Branch: feat/foundation/api-conventions
> PR: https://github.com/DavidSalmon13/ink/pull/46 (spec shaping) · https://github.com/DavidSalmon13/ink/pull/47 (T1–T2)

## Tests first (TDD)

- [x] T1 Failing ErrorFormatIT: unknown route → 404 not_found, malformed JSON → bad_request, invalid body → validation_failed with details.fields, no token → 401 unauthorized, forced exception → internal_error without internals (AC5, AC9)
- [x] T2 Failing SettingsIT: seeded defaults, PUT with version saves and bumps, identical retry is a 200 no-op, stale version → 409 version_conflict with details.current, negative agorot → validation_failed (AC2, AC3, AC6)
- [x] T3 Failing AttachmentIT (Postgres + S3Mock Testcontainers): PUT creates + returns upload URL, bytes PUT to it are fetched back via download-url, identical retry no duplicate, bad mime/size rejected, DELETE soft-deletes and repeats 204, deleted → 404 (AC2, AC4, AC7, AC8)

## Shared conventions (api/common)

- [x] T4 common/SyncedEntity (@MappedSuperclass: client UUID, timestamps, deletedAt, @Version) + VersionedWrites (create-or-update by id, identical-retry no-op, conflict, soft delete) (AC1–AC4)
- [ ] T5 common/ApiError + GlobalExceptionHandler; move AuthExceptionHandler's mappings in and build ApiErrorWriter's body from ApiError (owner-auth-lock hand-off; AuthIT unchanged and green) — T1 green (AC5, AC9)

## Settings

- [ ] T6 V3__settings.sql: single-row settings table (jsonb estimateTables/calibrationPoints) seeded with data-model.md defaults (AC6)
- [ ] T7 settings/: Settings entity, repository, DTO validation, GET/PUT /settings via VersionedWrites — T2 green (AC6)

## Attachments

- [ ] T8 Storage setup: AWS SDK s3 dependency, StorageProperties + application.yml (env-driven), s3mock in docker-compose.yml, .env.example placeholders, README run note (AC8)
- [ ] T9 V4__attachment.sql + Attachment entity/repository (kind, storageKey, mimeType, sizeBytes, width?, height?) (AC1, AC7)
- [ ] T10 StorageService (S3Presigner, 15-min PUT/GET) + AttachmentController PUT /attachments/{id}, GET /attachments/{id}/download-url, DELETE /attachments/{id} — T3 green (AC7)

## Mobile client

- [ ] T11 Tests first, then: ApiError.details in src/api/client.ts (owner-auth-lock hand-off); src/api/settings.ts; src/api/attachments.ts (request upload, PUT bytes to presigned URL, download URL, delete) (AC10)

## Verification

- [ ] T12 Run QA against acceptance criteria (qa skill)
