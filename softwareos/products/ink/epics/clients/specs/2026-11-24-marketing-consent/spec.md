# Marketing Consent

> Epic: ../../epic.md
> Status: in-progress
> Branch: feat/clients/marketing-consent
> Covers: POST /clients/{id}/consent, apps/api/src/main/resources/db/migration/V6__consent.sql, apps/api/src/main/java/app/ink/api/client/Consent*, apps/api/src/main/java/app/ink/api/client/MarketingConsent.java, the marketingConsent / consentUpdatedAt fields of the client API, apps/mobile/src/features/clients/card/ConsentRow.tsx, apps/mobile/src/features/clients/card/useConsent.ts, the consent row in apps/mobile/src/features/clients/card/ClientCard.tsx, formatDayDate in apps/mobile/src/ui/hebrewDate.ts

## Overview

Aya records on the client card whether a client agreed to marketing messages, and withdraws it when asked. Every change
appends a `ConsentEvent`, so there's an audit trail. `Client.marketingConsent` and `consentUpdatedAt` hold a cached copy
of the latest event. Each client also gets a unique `unsubscribeToken`, ready for the Phase 2 unsubscribe link. This spec
completes the Clients epic.

It serves these parts of the epic brief and mission:
- goal 4: consent is explicit, revocable and audited, ready for Phase 2 email;
- the success criterion "Granting or revoking consent writes a `ConsentEvent` and updates `Client.marketingConsent`";
- data-model.md §6: consent must be explicit, revocable and tracked, and every email must carry an unsubscribe link.

It builds on `client-list` (the `client` table and API) and `client-card` (the card), both done.

**Design:** the consent row is in `ClientCard.html` (iPhone) and `ClientCard.ipad.html`, but only in its granted state.
The "לא ניתנה" and "בוטלה" states mirror that row. The confirmation dialogs have no mockup: they use the `src/ui` Modal +
Button, like `DeleteClientDialog`, and Aya approves them from screenshots.

## Goals & User Stories

- As Aya, I see on the client card whether the client agreed to marketing messages, and since when.
- As Aya, I record a client's consent with one tap and a confirmation.
- As Aya, I withdraw consent ("ביטול הסכמה") when a client asks, and the date of the withdrawal is shown.
- As Aya, I trust that every grant and withdrawal is kept in a history, even though the MVP doesn't show it.

## Acceptance Criteria

1. AC1: Migration V6 adds `consent_event` (`id`, `client_id` FK, `action` granted|revoked, `source` app|unsubscribe_link,
   `at`). It also adds these columns to `client`:
   - `marketing_consent` (none|granted|revoked, default `none`, not null);
   - `consent_updated_at`;
   - `unsubscribe_token` (not null, unique), backfilled for existing rows.

   New clients get a random token on create. The token never appears in any API response.
2. AC2: `GET /clients`, `GET /clients/{id}` and `PUT /clients/{id}` return `marketingConsent` and `consentUpdatedAt`.
   `PUT` ignores them, because consent changes only through AC3.
3. AC3: `POST /clients/{id}/consent` with `{ "action": "granted" | "revoked" }` does the following in one transaction:
   - appends a `ConsentEvent` (source `app`, `at` = now);
   - sets `marketingConsent` and `consentUpdatedAt`;
   - returns the updated client.

   If the action equals the current state, it changes nothing, writes no event, and returns 200 with the client
   (retry-safe). A bad action → 400 `validation_failed`. An unknown or deleted client → 404 `not_found`. No token → 401.
4. AC4: Changing consent bumps the client's `version`. A later save from a device that still holds the old version gets
   the usual 409 `version_conflict`.
5. AC5: The card shows the row under the next-appointment line, as in `ClientCard.html` and `ClientCard.ipad.html`:
   - granted: "הסכמה לדיוור: **ניתנה · dd.MM.yyyy**" + the ghost button "ביטול הסכמה";
   - revoked: "**בוטלה · dd.MM.yyyy**" + "מתן הסכמה";
   - none: "**לא ניתנה**" + "מתן הסכמה".

   The date is `consentUpdatedAt` as seen in `Asia/Jerusalem`.
6. AC6: Each button opens a confirmation:
   - "לרשום הסכמה לדיוור?" with "ביטול" / "אישור";
   - "לבטל את ההסכמה לדיוור?" with "ביטול" / "ביטול הסכמה".

   Confirming sends the POST and updates the card's cached client (the new version). It then refreshes the client lists
   and shows the toast "ההסכמה עודכנה". Offline → "אין חיבור לאינטרנט. ההסכמה לא עודכנה." Other failures →
   "ההסכמה לא עודכנה. נסו שוב." In both failure cases the row keeps its old state.
7. AC7: The row and the dialogs use only tokens and `src/ui` components, with logical start/end. They match the mockups
   on the iPhone and the iPad. Aya approves the none, revoked and dialog states from screenshots.

## Technical Approach

- **Migration `V6__consent.sql`:**
  - `create table consent_event` with an index on `client_id, at`;
  - `alter table client add` the three columns (consent defaults to `'none'`);
  - backfill `unsubscribe_token` with `md5(random()::text || id::text) || md5(clock_timestamp()::text || id::text)`, or
    `gen_random_uuid()`-based. No extension is needed: `gen_random_uuid` is built into PG13+;
  - then `set not null` + `unique`.
- **API (`app.ink.api.client`):**
  - `ConsentEvent` entity: append-only, a plain `@Entity`. It is not a `SyncedEntity`, because it's never edited or deleted.
  - `ConsentEventRepository`.
  - On `Client`: the fields `marketingConsent` (enum `MarketingConsent { none, granted, revoked }`, stored as text),
    `consentUpdatedAt` and `unsubscribeToken`. The token is set in the constructor from `SecureRandom` (32 bytes,
    base64url) and has no getter in `ClientView`.
  - `ConsentService.change(id, action)` is `@Transactional`. It does `em.find`, which gives 404 if the client is missing
    or deleted. If the state already matches, it returns the client unchanged. Otherwise it persists the event and sets
    the client's fields; JPA `@Version` bumps `version`, which gives AC4.
  - `ClientController` gains `@PostMapping("/{id}/consent")` with `record ConsentInput(@NotNull ConsentAction action)`.
    `ClientView` gains `marketingConsent` and `consentUpdatedAt`. `sameAs` / `set` stay untouched, so PUT ignores consent.
- **Mobile:**
  - `api/clients.ts`: `Client` gains `marketingConsent: 'none' | 'granted' | 'revoked'` and `consentUpdatedAt: string | null`,
    plus `postConsent(api, id, action)`.
  - `features/clients/card/useConsent.ts`: a `useChangeConsent(id)` mutation.
    - `onSuccess`: `setQueryData(clientDetailKey(id), client)`, invalidate `[...clientsKey, 'list']`, show the toast.
    - `onError`: `NetworkError` → the offline toast, anything else → the failure toast.

    It copies `useDeleteClient` in `useClientCard.ts`.
  - `ConsentRow.tsx`: the row plus the confirm Modal, following `DeleteClientDialog.tsx`.
  - `ClientCard.tsx`: render `<ConsentRow>` after the next-appointment line, on both the iPhone and the iPad pane.
  - `ui/hebrewDate.ts`: `formatDayDate(iso)` → "02.10.2026", built on `israelCalendarDay`.

## Out of Scope

- Sending marketing email, campaigns, and the public unsubscribe page or endpoint (Phase 2). `source = unsubscribe_link`
  exists in the schema but nothing writes it yet.
- Consent history UI, and setting consent from the create/edit modal.
- Exposing `unsubscribeToken` through the API.

## Standards Applied

- [global/git-workflow](../../../../../../standards/global/git-workflow.md) — branch `feat/clients/marketing-consent`, conventional commits scoped `clients`, PRs via the pr skill.
- [frontend/design-fidelity](../../../../../../standards/frontend/design-fidelity.md) — the consent row copies `ClientCard.html` / `.ipad.html`; tokens only; start/end.

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-11-24 | david-schwartzman | created | Initial shaping | — |
| 2026-11-24 | david-schwartzman | deviation | T9 compared the consent row (none, granted, revoked) and both confirmation dialogs with `ClientCard.html` / `ClientCard.ipad.html` from **web-preview** screenshots at iPhone (393×852) and iPad (1180×820) sizes (`visuals/consent-iphone-web.png`: none → grant dialog → granted → revoke dialog → revoked; `visuals/consent-ipad-web.png`: granted, revoked), not the iOS Simulator (no Xcode on the dev machine). Fixed: on iPhone the row's top hairline was inset by the screen padding; the mockup's `.px.consent` puts the padding inside the bordered row, so the line now runs edge to edge (the iPad pane keeps it inside the pane, as in `.ipad.html`). Matches: 12px above the line, 10px under it, 14px text with the bold value, the dd.MM.yyyy date as an LTR run, the ghost small button at the end. Implementation notes: the request's `action` is a validated string, not the `ConsentAction` enum, so a bad value is `validation_failed` as AC3 requires (an enum fails JSON parsing as `bad_request`); revoking from `none` writes a `revoked` event, since AC3 only skips the current state. Unmockuped, for Aya (T10): the dialogs have the AC6 title and buttons only, no body text, and the "ביטול הסכמה" confirm uses the destructive button like "מחיקה" in the delete dialog. **Owed:** an iPhone and iPad simulator/device check. | T9 |
| 2026-11-24 | david-schwartzman | approval | Aya approved the consent row (none, granted, revoked) and both confirmation dialogs (title + buttons only, the destructive "ביטול הסכמה") on iPhone and iPad from the T9 web-preview screenshots (`visuals/consent-iphone-web.png`, `visuals/consent-ipad-web.png`), taken of the code at 49f83e2 (AC7). The simulator/device check is still owed. | T10 |
