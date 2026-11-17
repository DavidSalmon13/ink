# API Conventions

> Epic: ../../epic.md
> Status: shaped
> Branch: feat/foundation/api-conventions
> Covers: GET /settings, PUT /settings, PUT /attachments/{id}, GET /attachments/{id}/download-url, DELETE /attachments/{id}, apps/api/src/main/java/app/ink/api/common/**, apps/api/src/main/java/app/ink/api/settings/**, apps/api/src/main/java/app/ink/api/attachment/**, apps/api/src/main/resources/db/migration/V3__settings.sql, apps/api/src/main/resources/db/migration/V4__attachment.sql, apps/mobile/src/api/settings.ts, apps/mobile/src/api/attachments.ts, minio service in docker-compose.yml

## Overview

The shared backend rules every later Foundation-and-beyond feature uses, so Clients, Calendar,
Sketches and the rest add endpoints instead of reinventing them: a synced-entity base (device UUID,
timestamps, soft delete, version), safe-to-retry writes, one error format, the Settings row + endpoint,
and photo/image attachments through presigned URLs. Serves the epic's "private and synced across
iPhone and iPad" goal and the data model's "retries, sync and backup restore never create duplicates".
Attachments run against a local S3-compatible store (MinIO) here. `deploy-pipeline` points the same
code at the real Cloudflare R2 bucket by configuration.

## Goals & User Stories

- As Aya, saving on my iPhone and iPad never creates duplicates, even when a save is retried on a bad connection.
- As Aya, if I edit the same thing on both devices, the second save tells me it changed instead of silently overwriting it.
- As Aya, nothing I delete is lost for good (it's hidden, not erased), so sync and restores stay consistent.
- As Aya, my prices and time-estimate tables live in Settings and can be changed later.
- As Aya, my tattoo photos and sketch images are stored privately and only reachable through short-lived links.
- As the developer of later epics, I get the entity base, write rules, errors and attachments ready-made.

## Acceptance Criteria

1. AC1: A shared synced-entity base gives every synced table a device-generated UUID `id`, server-set
   `createdAt`/`updatedAt` (timestamptz, UTC), nullable `deletedAt`, and an integer `version`. Settings and
   Attachment use it.
2. AC2: Writes are safe to retry. Create and update are both `PUT /<things>/{id}` carrying the expected
   `version` (absent on create). Repeating an identical request returns 200 with the same record and does
   not bump `version`. No request ever creates a duplicate row.
3. AC3: Optimistic locking: a PUT whose `version` doesn't match the stored one returns 409
   `version_conflict` with the current record in `details.current`. A matching PUT saves and increments `version`.
4. AC4: Soft delete: `DELETE /<things>/{id}` sets `deletedAt` and returns 204, also when repeated.
   Deleted records are excluded from reads (404 `not_found`). No code path hard-deletes.
5. AC5: Every API error, auth included, is `{"error": {"code", "message", "details"?}}` with a stable
   snake_case code: `bad_request`, `validation_failed` (per-field `details.fields`), `unauthorized`,
   `not_found`, `version_conflict`, `payload_too_large`, `unsupported_media_type`, `too_many_attempts`,
   `invalid_credentials`, `internal_error`. A 500 never exposes stack traces or request values. Login's
   codes and statuses are unchanged for the app.
6. AC6: Settings is one row, seeded by migration with the data-model defaults (`minimumPriceAgorot` 35000,
   `minimumMinutes` 30, `hourlyRateAgorot` 33000, `designHourlyRateAgorot` 20000, `needleOpeningCostAgorot`
   7000, `extraNeedleCostAgorot` 5000, `estimateTables` and `calibrationPoints` per data-model.md,
   `autoLockSeconds` 0, `timezone` Asia/Jerusalem). `GET /settings` returns it; `PUT /settings` updates
   it under AC2/AC3. Money stays integer agorot and must be ≥ 0.
7. AC7: `PUT /attachments/{id}` with `{kind, mimeType, sizeBytes, width?, height?}` creates the record
   (kinds `tattoo_photo` | `sketch`; types jpeg, png, heic, webp; up to 15 MB) and returns a presigned
   upload URL valid for 15 minutes. `GET /attachments/{id}/download-url` returns a presigned download URL
   valid for 15 minutes. `DELETE /attachments/{id}` soft-deletes it. The bucket is private: no public URLs.
8. AC8: Locally, attachments use a MinIO service in `docker-compose.yml` (bucket created on start). The
   endpoint, bucket and keys come from environment variables (`.env.example` placeholders only), so R2
   needs configuration, not code.
9. AC9: Every new endpoint requires a valid `Authorization: Bearer` session. Without one it returns 401 `unauthorized`.
10. AC10: The mobile API client exposes `code`, `message` and `details` on `ApiError`.
    `src/api/settings.ts` and `src/api/attachments.ts` provide typed helpers (get/save settings; request
    upload → PUT the bytes to the presigned URL; get download URL; delete).
11. AC11: `./gradlew build` passes, including Testcontainers integration tests (Postgres + MinIO) for
    AC2–AC9. Mobile `npm run typecheck`, `npm run lint` and `npm test` pass. CI is green.

## Technical Approach

**Entity base:** `common/SyncedEntity` is a JPA `@MappedSuperclass` (`id` UUID assigned by the client,
`createdAt`/`updatedAt` via `@PrePersist`/`@PreUpdate`, `deletedAt`, `@Version long version`).
Repositories read with `deletedAt is null`.

**Writes:** `common/VersionedWrites` takes the id, the expected version and the request payload:
- missing row → insert (version 0);
- row exists and payload equal to stored → 200, unchanged (an identical retry);
- version matches → apply the change and increment;
- otherwise → `VersionConflictException(current)`.

Soft delete sets `deletedAt` once; repeat deletes are a no-op 204.

**Errors:** `common/ApiError` (record) + `common/GlobalExceptionHandler` (`@RestControllerAdvice`)
map validation, not-found, conflict, size and media-type errors, and any unhandled exception to
`internal_error`, with a fixed message. Hand-off from owner-auth-lock: `auth/ApiErrorWriter` builds its
body via `ApiError`, and `AuthExceptionHandler`'s mappings move into the global handler (same codes,
same statuses). `AuthIT` must stay green unchanged.

**Settings:**
- `V3__settings.sql` creates the single-row table (with a check that only one row exists) and seeds it.
  JSON columns are `jsonb`.
- `settings/` has `Settings` (entity), `SettingsRepository`, `SettingsController` (`GET`/`PUT /settings`)
  and a DTO with Bean Validation.

**Attachments:**
- New dependency: AWS SDK v2 `s3` (R2 and MinIO are both S3-compatible; path-style access).
- `StorageProperties` (`app.storage.endpoint/region/bucket/access-key/secret-key`) and `StorageService`
  (S3Presigner: 15-minute PUT/GET).
- `V4__attachment.sql`, the `Attachment` entity, `AttachmentRepository` and `AttachmentController`.
- `storageKey = attachments/<id>`.
- `docker-compose.yml` gains `minio` plus a one-shot `minio-init` that creates the bucket.
- ITs run MinIO via Testcontainers (`MinIOContainer`).

**Mobile:**
- `src/api/client.ts` (owner-auth-lock hand-off): `ApiError` gains `details`, and `parseErrorBody`
  reads it.
- New `src/api/settings.ts` and `src/api/attachments.ts` use the existing `ApiClient`. Uploads `fetch`
  a `PUT` to the presigned URL with the file's content type, with no auth header (the URL is the credential).

**Out of the API:** no generic CRUD framework. Later epics write their own controllers using these pieces.

## Out of Scope

- The real Cloudflare R2 bucket, Railway env vars and the first deploy (`deploy-pipeline`).
- Delta sync / "changed since" endpoints (MVP is online-first per architecture.md).
- Newsletter attachments and PDFs (`kind = newsletter`, phase 2); `Settings.testEmail` (phase 2).
- Image resizing/thumbnails; cleaning up orphaned uploads.
- A Settings screen in the app (Settings epic); wiring `autoLockSeconds` into the app lock.
- Writing API standards docs (follow-up via `/curate`).

## Standards Applied

- [global/git-workflow](../../../../../../standards/global/git-workflow.md) — branch, conventional commits, PRs via the pr skill.

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-11-17 | David Schwartzman | created | Initial shaping (role: Both, TDD; attachments local-first on MinIO) | — |
