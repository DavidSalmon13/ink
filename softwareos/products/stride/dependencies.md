# Dependencies

## Internal

(none)

## External

| Service | Purpose | Auth method | Docs |
|---|---|---|---|
| Neon | PostgreSQL hosting (database), connected to the API project | `DATABASE_URL` connection string (API env var) | TBD |
| Vercel | Hosting + preview deploys — two projects: web (Next.js) and API (NestJS) | GitHub integration | TBD |
| Vercel Blob | Product image storage; the CMS uploads straight from the browser with a client token issued by the API. One hand-made dev store now; preview and production stores deferred (Vercel) | `BLOB_READ_WRITE_TOKEN` (API env var only) | https://vercel.com/docs/vercel-blob |
| GitHub + GitHub Actions | Repo, PRs, CI | GitHub account | TBD |
| Figma (via MCP) | Design source of truth | OAuth | TBD |
| Google Stitch | UI generation — design-time only, not used by the running app | TBD | TBD |

No payments, email or analytics services in v1. Auth is an in-house module of our own API (`apps/api/src/auth/`), not an external service; its secrets `PASSWORD_PEPPER` and `GUEST_CART_SECRET` are API env vars, as is `BLOB_READ_WRITE_TOKEN`. The web app's only backend setting is `API_URL` (server-only).
