# Auth Security

Rules for any code that knows who the user is. The design behind them is in `softwareos/products/stride/architecture.md` (Auth module).

## Who the user is

- Only the API's auth module (`apps/api/src/auth/`) touches session tokens, password hashes and creates or deletes the session cookie. Other API code uses its `AuthGuard` and current-user decorator; the web app uses `getCurrentSession()` (calls `GET /auth/me`) or `requireUser()` (`src/features/session/require-user.ts`). One exception: the web proxy may re-send the existing session cookie unchanged (Max-Age refresh on GET) through `refreshSessionCookie` in `packages/shared/src/session-cookie.ts`. It never builds cookie attributes itself, never reads the token's meaning and never deletes the cookie.
- Every API endpoint that changes data or returns private data runs the `AuthGuard`. That is the authorization layer. The web's `requireUser()` and proxy/middleware only decide what to render or where to redirect; they are not authorization.
- The user ID always comes from the session. Never accept a `userId` from the client.
- Scope every private query by the session user (`where: { id, userId: user.id }`). An object the user doesn't own returns 404, not 403.

## Sessions and passwords

- Create a **new** session token at login, sign-up and password change. Never reuse a token that arrived with the request.
- Store only `sha256(token)` server-side; the raw token lives only in the HttpOnly `__Host-stride_session` cookie (never `localStorage`).
- Hash passwords with Argon2id + pepper via the API auth module's password service. Never hash on the client or in `apps/web`.

## Requests

- GET never changes state. Every change, including logout, is a POST (or DELETE) to `/api/*`.
- Redirect targets taken from input (`next`, `callbackUrl`) must be same-origin relative paths; otherwise fall back to `/`.
- The API is publicly reachable, so it trusts nothing a direct caller sends. One global Nest middleware rejects any request without a valid `x-stride-proxy-secret` (`WEB_PROXY_SECRET`, constant-time compare) with 401. `/cron/*` is the only exception (Bearer `CRON_SECRET`). The web sets that secret on every call, from the proxy's `/api` rewrite and from Server Components, and overwrites any client-sent copy.
- Vercel Blob's `onUploadCompleted` callback is skipped (decided in `product-images`, 2026-10-20): the CMS posts the blob URL to the API on save, which checks it (https, exact store host, the product's prefix, `head()`) before writing. There is no callback route and no second exception; `/cron/*` stays the only one. `BLOB_READ_WRITE_TOKEN` lives on the API only, and an unset token makes the image endpoints fail closed with 503.
- The client IP comes only from `x-stride-client-ip` on a request that passed that check (validated, else null), never from `x-forwarded-for`, `x-real-ip` or the connecting address. Per-IP throttles skip a null IP (fail open) and never put every caller in one shared bucket.
- The API checks `Origin` on every state-changing request: it must equal `https://` + the trusted `x-stride-forwarded-host` (`http://` in local dev only). A missing or different `Origin` gets 401. The browser reaches the API only through the same-origin `/api` rewrite — no CORS.

## Secrets and logs

- Secrets (`DATABASE_URL`, `PASSWORD_PEPPER`, `GUEST_CART_SECRET`, `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`) live in the API project's env vars with a different value per environment — never on the web project, never in the CMS bundle and never in a `NEXT_PUBLIC_` variable. Browsers get only short-lived Blob client tokens, issued by an `AuthGuard` + admin guard endpoint. `WEB_PROXY_SECRET` is the one secret on both projects (same value on both, different per environment, server-only on the web).
- Never log passwords, session tokens, cookies, reset links or raw request bodies from auth endpoints. Users see generic errors; details go to logs only.

## Cron endpoints

- `/cron/*` endpoints authenticate with `Authorization: Bearer $CRON_SECRET`: a length check, then a constant-time compare (`crypto.timingSafeEqual`). An unset or empty `CRON_SECRET` fails closed with 401, as do a missing header, another scheme or a wrong secret. They are the one exception to "GET never changes state" (Vercel Cron only sends GET); they take no cookie, so there's no CSRF surface, and they never log headers.
