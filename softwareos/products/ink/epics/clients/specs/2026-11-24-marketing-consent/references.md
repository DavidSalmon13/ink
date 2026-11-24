# References for Marketing Consent

## Related Specs

- **[Considered]** [2026-11-19-client-card](../2026-11-19-client-card/spec.md) — matched on `apps/mobile/src/features/clients/card/**` (ConsentRow.tsx, ClientCard.tsx), dismissed in Step 4d: client-card owns the card but explicitly deferred the consent row to this spec (its Overview and Out of Scope).
- **[Considered]** [2026-11-18-client-list](../2026-11-18-client-list/spec.md) — matched on `apps/api/src/main/java/app/ink/api/client/**`, `apps/mobile/src/features/clients/**`, `apps/mobile/src/api/clients.ts` and `ClientView`, dismissed in Step 4d / the Step 6 recheck: this spec only adds consent fields and calls to those shared files, and client-list deferred consent here (its Out of Scope).

## Upstream Meeting

_None._

## Design

- `design/pages/ClientCard.html:151` and `design/pages/ClientCard.ipad.html:157` — the `.consent` row (granted state only; `.consent{padding-top:10px;border-top:1px solid var(--border)}`, `margin-top:12px`, 14px text, `btn btn-ghost btn-sm`).
- `design/design-system/tokens.json` — all styles.

## Similar Implementations

### Client API

- **Location:** `apps/api/src/main/java/app/ink/api/client/ClientController.java`, `apps/api/src/main/java/app/ink/api/common/VersionedWrites.java`
- **Relevance:** where the consent endpoint and `ClientView` fields go.
- **Key patterns:** records with Bean Validation for input; `ApiException.NotFound` for missing/soft-deleted rows; `@Version` on `SyncedEntity` bumps `version` on any update.

### Card summary service

- **Location:** `apps/api/src/main/java/app/ink/api/client/ClientSummaryService.java`
- **Relevance:** a service beside the controller, the shape for `ConsentService`.

### Delete mutation + dialog

- **Location:** `apps/mobile/src/features/clients/card/useClientCard.ts` (`useDeleteClient`), `apps/mobile/src/features/clients/card/DeleteClientDialog.tsx`
- **Relevance:** the mutation / toast / NetworkError pattern and the `src/ui` Modal confirmation (not `Alert`, which does nothing on web).

### Israel-time dates

- **Location:** `apps/mobile/src/ui/hebrewDate.ts`
- **Key patterns:** `israelCalendarDay` for `formatDayDate` (Asia/Jerusalem).
