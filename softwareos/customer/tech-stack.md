# Ink — Tech Stack

## Frontend

- Expo (React Native) + TypeScript, Expo Router
- iPhone and iPad from one codebase; Hebrew UI with forced RTL layout
- Face ID / device passcode via `expo-local-authentication`
- EAS Build → TestFlight for distribution

## Backend

- Spring Boot 3 on Java 21 (LTS), REST API
- Spring Security (single owner account, token auth)
- Scheduled jobs (`@Scheduled` / Quartz) for scheduled email sends: run while the app is closed, with retries and duplicate protection

## Data

- PostgreSQL (managed, on Railway)
- Cloudflare R2 (S3-compatible) for tattoo photos, sketches and newsletter attachments

## Infra & Services

- Railway: Spring Boot container + Postgres
- Resend: transactional/newsletter email with attachments, unsubscribe
- GitHub: `DavidSalmon13/ink`

## Conventions

- Monorepo: `apps/mobile` (Expo) and `apps/api` (Spring Boot)
- Money stored as integer agorot (ILS)
- Git workflow: see `softwareos/standards/global/git-workflow.md`
