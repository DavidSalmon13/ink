# References for Monorepo Scaffold

## Related Specs

_None._ No other specs existed when this one was shaped (2026-11-15).

## Upstream Meeting

None.

## Similar Implementations

None. The repo is greenfield; there's no app code yet.

### Context docs

- **Tech plan:** [`../../tech-plan.md`](../../tech-plan.md) defines this as the first candidate spec in the build order (local first, deploy last).
- **Tech stack:** [`../../../../tech-stack.md`](../../../../tech-stack.md) lists the Expo Go–compatible libraries, Spring Boot 3, Java 21, Gradle and Flyway.
- **Architecture:** [`../../../../architecture.md`](../../../../architecture.md) covers Environments (local: Compose + bootRun + Expo Go) and Gotchas (UTC `timestamptz`, logical start/end styles).

### Design (referenced only, owned by app-shell)

- `design/design-system/tokens.json`
- `design/pages/Home.html`

This spec ships a plain placeholder screen. The design-fidelity standard applies starting with `app-shell`.
