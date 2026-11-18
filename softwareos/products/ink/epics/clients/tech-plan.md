# Clients — Tech Plan

> Epic: epic.md · Product: ../../mission.md

## Approach

Two new tables, `client` and `consent_event` ([data-model.md](../../data-model.md) → Client, ConsentEvent).
`Client` extends `SyncedEntity` and is written through `VersionedWrites`: `PUT /clients/{id}` creates or updates
idempotently with a device-generated UUID, and a stale `version` gets a 409 `version_conflict`. The API adds
`GET /clients?q=` (search over the name, the phone as digits only, and the Instagram handle lowercased with
no `@`), `GET /clients/{id}`, and a soft `DELETE /clients/{id}`. Consent goes through
`POST /clients/{id}/consent`, which appends a `ConsentEvent` and updates the cached `Client.marketingConsent` /
`consentUpdatedAt` in one transaction. The client card's computed fields (tattoo count, "הכנסות לפי תורים
שהסתיימו", next appointment) are a server-side summary that returns zero or empty until the later epics add their
tables. In the mobile app, the Clients tab becomes a list with search, plus a create/edit modal and a client card
route, built from the existing `src/ui` components and `design/pages/ClientCard.html` / `ClientCard.ipad.html`.
Clients is the first list entity, so TanStack Query (with a persisted cache, per architecture.md → Data Flow)
is introduced here.

## Architecture Impact

- **No new services or infrastructure.**
- **Schema:** two Flyway migrations, one per slice that needs it. `client-list` adds `client` (with a phone-digits
  column and a lowercased Instagram column for search). `marketing-consent` adds `consent_event` and the unique
  `client.unsubscribe_token` (backfilled for existing rows).
- **API:** a new `app.ink.api.client` package, following the `settings` module and `common/VersionedWrites`.
- **Mobile:** adds `@tanstack/react-query` and a persister (architecture.md already names it as the read cache,
  but it isn't installed yet); the list goes in the `(tabs)/clients` tab, and the card is a new route `app/clients/[id]`.
- architecture.md itself doesn't need to change.

## Risks & Unknowns

- **Design gap:** there's no mockup for the clients list, the create/edit form, or the empty and search-no-results
  states; only `ClientCard.html` / `ClientCard.ipad.html` exist. Flag to design before shaping `client-list`, or
  derive the screens from the design system (`design/design-system/`) and get Aya's approval.
- **Hebrew search:** final letters (ם/מ, ן/נ, ך/כ, ף/פ, ץ/צ) and niqqud. Choose between a Postgres `ILIKE` with a
  trigram index and a plain `ILIKE`; at this data size (a few hundred clients), plain is likely enough.
- **Phone normalization:** Israeli formats (`054-…`, `+972 54…`, `972…`) must match each other.
- **Offline read cache:** the persisted TanStack Query cache is the first offline-read work. Invalidating the cache
  after a 409 conflict needs a pattern that later epics will copy.
- **Card summary:** its fields depend on later epics, so the summary has to be easy to extend without changing
  the API contract.
- No spike needed.

## Candidate Specs

- `client-list`: `client` table migration, PUT/GET/search API, TanStack Query setup, the Clients tab with list + search,
  and the create/edit modal. Needs the list/form design decision first.
- `client-card`: the card route per `ClientCard(.ipad).html`. Contacts with call / WhatsApp / Instagram actions, the
  summary endpoint (empty states for now), tab shells for tattoos / quotes / notes, soft delete, and the iPad list +
  card side by side.
- `marketing-consent`: a migration adding `consent_event` and `client.unsubscribe_token`, the grant/revoke
  endpoint, and the card's consent row (date + "ביטול הסכמה").
