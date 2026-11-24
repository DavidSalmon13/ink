# Tasks — Marketing Consent

> Epic: clients
> Spec: 2026-11-24-marketing-consent
> Branch: feat/clients/marketing-consent

## API  (PR 1)

- [x] T1 `V6__consent.sql`: consent_event table + index; client.marketing_consent / consent_updated_at / unsubscribe_token with backfill, not null, unique (AC1)
- [x] T2 `Client` consent fields + token from SecureRandom on create; `ConsentEvent` entity + `ConsentEventRepository` (AC1)
- [x] T3 `ConsentService.change` + `POST /clients/{id}/consent` in ClientController; `ClientView` gains marketingConsent / consentUpdatedAt (AC2, AC3, AC4)
- [x] T4 ClientIT cases: migration backfill + unique token not exposed; GET/PUT carry consent and PUT ignores it; grant / revoke write one event each; same-state is a no-op without an event; 400 bad action; 404 unknown/deleted; 401; stale PUT after consent → 409 (AC1–AC4)

## Mobile  (PR 2)

- [x] T5 `api/clients.ts` consent fields + `postConsent`; `formatDayDate` in `ui/hebrewDate.ts` (AC2, AC5)
- [ ] T6 `features/clients/card/useConsent.ts` (`useChangeConsent`: cache update, list invalidate, toasts) (AC6)
- [ ] T7 `ConsentRow.tsx` (three states + confirm modal) rendered in `ClientCard.tsx` on iPhone and iPad (AC5, AC6, AC7)
- [ ] T8 Tests: `__tests__/api/clients.test.ts` (postConsent) and `__tests__/clientCard.test.tsx` (three row states + date, grant/revoke confirm → POST → toast + new state, offline / failure toasts keep old state) (AC5, AC6)

## Verification  (PR 3)

- [ ] T9 Screenshots on iPhone + iPad (simulator/device, or web preview with a device check owed) vs ClientCard.html / .ipad.html; fix or record deviations in the Changelog (AC7)
- [ ] T10 HUMAN: Aya approves the none / revoked states and both confirm dialogs (AC7)
- [ ] T11 Run QA against acceptance criteria (qa skill)
