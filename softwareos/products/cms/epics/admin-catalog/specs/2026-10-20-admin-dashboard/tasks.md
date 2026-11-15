# Tasks: Admin Dashboard

> Epic: admin-catalog
> Spec: 2026-10-20-admin-dashboard
> Branch: feat/admin-catalog/admin-dashboard

## Landing page

- [x] T1 Built on the local branch `feat/admin-catalog/product-images` (user choice, 2026-10-20). Confirm `apps/cms/src/app/categories/`, `products/`, `stock/` and `images/` exist and `app.routes.ts` routes `categories` and `products`. If not, stop and report. (AC2)
- [x] T2 RED: rewrite apps/cms/src/app/dashboard/dashboard.component.spec.ts, starting with `// covers AC1, AC2, AC4, T2`. Add `provideRouter([])` and keep the HttpTestingController setup. It asserts: `/api/admin/status` is called once; the h1 is "Dashboard"; the purpose line; no "Nothing to manage yet"; four `li`s with h2s Categories/Products/Stock/Images in order; link names and hrefs `/categories`, `/products`, `/products`, `/products`. Run it and see it fail. (testing skill)
- [x] T3 GREEN: implement the landing page in apps/cms/src/app/dashboard/dashboard.component.ts per the Technical Approach (RouterLink, a static cards array, `@for`, existing token classes, `grid gap-4 md:grid-cols-2`). Update the file comment. T2 goes green. (AC1, AC2, AC3, AC4)

## Verification

- [x] T4 Run the cms unit tests, lint, typecheck and `npm run build`. Run `apps/web/e2e/admin-access.spec.ts` locally if :3000/:4000 are free (ask before stopping running servers). (testing skill)
  - 2026-10-20: cms `npm test` 131 passed (15 files), cms lint + prettier, cms typecheck and root `npm run build` green. `apps/web/e2e/admin-access.spec.ts` 7 passed (ports free; `TEST_DATABASE_URL` pointed at the Neon dev DB the API uses, user-approved).
- [ ] T5 Run the qa skill against AC1–AC4 and write qa-report.md. Include a manual pass: as an admin, open `/admin`, use each link, tab through the focus rings, and check 375px width. Scope check: only the dashboard component and its spec change. (qa skill)
