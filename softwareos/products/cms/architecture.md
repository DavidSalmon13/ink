# Architecture

## Components

- **CMS — `apps/cms` (`@stride/cms`):** Angular 22 SPA built with `base href` `/admin/`. Its static build is written to `apps/web/public/admin/` (gitignored) and served by the web app; it has no server, no env secrets and no database access
- **Web — `apps/web` (stride):** serves the CMS at `/admin/*`, falling back to the CMS `index.html` for deep links. Shows the admin nav link only when `GET /auth/me` reports the admin role. Its proxy treats `/admin/*` as a page route (session-cookie presence check only) and keeps rewriting `/api/*` to the API with the trusted proxy headers
- **API — `apps/api` (stride):** a new admin module (products, categories, stock, image upload token) behind `AuthGuard` plus a new admin guard that reads the role from the session's `User` row. `User` gains a role field (Prisma migration). `GET /auth/me` returns the role
- **Vercel Blob:** stores product images; the browser uploads to it directly

## Data Flow

- **Admin reads and writes:** Angular → same-origin `/api/admin/*` → web proxy adds the proxy-secret headers → Nest → proxy-secret and Origin checks → `AuthGuard` → admin guard → shared Zod validation → Prisma
- **Storefront:** the catalog reads the same tables, so CMS edits show up there. How catalog pages are revalidated after an edit is TBD
- **Image upload (product-images):** Angular's `upload()` asks `/api/admin/products/:id/image/token` for a client token (pinned to `products/<id>/`, JPEG/PNG/WebP, 5 MB, 10 min) → uploads straight to Blob (`https://vercel.com/api/blob/`) → `POST /api/admin/products/:id/image` saves the checked blob URL. Replace, remove and product delete best-effort delete the old blob

## Environments

- Same as stride: the web and API Vercel projects, a preview per PR, and a Neon branch per API preview. No extra Vercel project
- Blob: one hand-made dev store (`BLOB_READ_WRITE_TOKEN` in the gitignored `apps/api/.env`), an exception to the Vercel deferral. Preview and production stores are deferred (Vercel)

## Gotchas

- The admin role is enforced in the API. The Angular route guard and the hidden nav link are UX only
- `/admin` for non-admins: the web proxy redirects logged-out visitors to `/login`; logged-in non-admins get an access-denied page (decided from `/auth/me`)
- Blob's `onUploadCompleted` is skipped (product-images): the CMS posts the URL on save, so there's no Vercel → API callback and `/cron/*` stays the only proxy-secret exception
- Admin writes follow the same rules as every write: POST-only changes, Origin check, user ID only from the session (`standards/global/auth-security.md`)
- Removing a product that has past orders: soft or hard delete is TBD (`OrderItem` references it)
- The web build must run the CMS build first (root build order)
