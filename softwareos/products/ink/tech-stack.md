# Tech Stack

## Frontend

- Expo (React Native) + TypeScript, Expo Router, one codebase for iPhone and iPad
- Hebrew UI, RTL forced via `I18nManager` (needs an app reload to take effect)
- `expo-local-authentication` (Face ID / device passcode), `expo-secure-store` (tokens)
- Server state: TanStack Query with a persisted on-device cache (read offline)
- `expo-print` + `expo-sharing` for the monthly PDF report (HTML → PDF, RTL-safe)
- `expo-image-picker` for tattoo photos and sketches
- During the MVP: Expo Go + EAS Update for demos (Expo Go–compatible libraries only)
- After MVP acceptance: EAS Build → TestFlight (needs a paid Apple Developer account)

## Backend

- Spring Boot 3, Java 21 (LTS), Gradle
- Spring Web (REST/JSON), Spring Security (single owner account, JWT access + refresh tokens)
- Spring Data JPA + Flyway migrations
- Bean Validation; pricing and income logic in pure, unit-tested domain services
- Phase 2: Spring scheduling (`@Scheduled`/Quartz) for scheduled email sends

## Database

- PostgreSQL (Railway managed); local development via Docker Compose

## Other

- Cloudflare R2 (S3-compatible, AWS SDK v2) for images and attachments, through presigned URLs
- Resend for email (phase 2)
- Railway hosting for the API container + Postgres
- GitHub `DavidSalmon13/ink` (monorepo: `apps/mobile`, `apps/api`)
