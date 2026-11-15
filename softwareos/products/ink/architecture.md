# Architecture

## Components

- **`apps/mobile` (Expo app)**: all UI. Handles the app lock (Face ID/passcode),
  client mode (app-local, sketches only), the pricing calculator preview, PDF
  generation and sharing, and the read cache.
- **`apps/api` (Spring Boot)**: the source of truth. REST API for every entity;
  owns the pricing calculation (authoritative copy), income/balance aggregation by month,
  presigned R2 URLs, and (phase 2) the email scheduler and unsubscribe endpoint.
- **PostgreSQL**: all records (see [data-model.md](data-model.md)).
- **Cloudflare R2**: tattoo photos, sketch images, newsletter attachments. The bucket is
  private and is only accessed through short-lived presigned URLs.
- **Resend (phase 2)**: newsletter delivery with attachments.

## Data Flow

- App → API: HTTPS JSON, `Authorization: Bearer <access token>`. Refresh tokens are kept in
  `expo-secure-store`.
- Image upload: the app asks the API for a presigned PUT URL, uploads straight to R2, then
  saves the record pointing to that `Attachment`. Downloads use presigned GET URLs.
- Sync (MVP, online-first): every device reads and writes through the API; TanStack
  Query persists the last results so data can be read offline. Writes need a connection.
  IDs are UUIDs generated on the device and writes are idempotent (retries and backup
  restore never create duplicates).
- Derived data (completed status, income, balance, gallery, client totals) is computed by
  the API when read and never stored.
- PDF: the app fetches the month's report data from the API and renders HTML → PDF on
  the device.
- Phase 2: the scheduler picks due campaigns → re-checks consent for each recipient → sends via
  Resend → records the delivery status for each recipient.

## Environments

- **Local**: Postgres in Docker Compose, API via `./gradlew bootRun`, app via Expo Go /
  dev client.
- **Production**: API container + Postgres on Railway, R2 bucket.
- **Preview (during the MVP)**: web build of the Expo app (static files on Railway) at a public URL Aya can open; Expo Go via EAS Update for the iPhone experience. The web build is a preview, not a supported platform: no device lock, and tokens are kept in memory.
- **After MVP acceptance**: native app via TestFlight.
- **Staging**: TBD.

## Gotchas

- **RTL**: forced RTL needs a reload; use logical styles (`start`/`end`, not `left`/`right`).
  Mixed Hebrew + numbers/₪ needs checking on every screen.
- **Money** is integer agorot everywhere (API, DB, app). Format only at display time.
- **Time**: store `timestamptz` (UTC); bucket months and decide whether an appointment has passed in
  `Asia/Jerusalem`.
- **Income wording**: always "income from completed appointments" (הכנסות לפי תורים
  שהסתיימו), never "actual income". No income or money totals on the home screen. No
  prices on sketches.
- **Client mode** must not be able to reach any other route; leaving it requires
  authentication. Treat this as a security boundary and test it.
- **No hard deletes**: every table uses `deletedAt` (soft delete) so sync and restore stay consistent.
- Pricing is computed on the device for an instant preview and again on the API when saving; both
  must agree (shared test vectors in the spec).
