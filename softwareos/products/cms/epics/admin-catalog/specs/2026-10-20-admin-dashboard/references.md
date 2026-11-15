# References for Admin Dashboard

## Related Specs

- **[Related]** [cms / admin-catalog / 2026-10-19-admin-foundation](../2026-10-19-admin-foundation/spec.md) — strong overlap: its Covers claims `/admin` and `apps/cms/**`. Confirmed in Step 4d and kept separate in 4e ("Create anyway") because admin-foundation owns the shell, guard and routes, while this spec only replaces the empty dashboard content named in its AC7. The `/api/admin/status` call and the "Dashboard" heading its e2e checks are kept.
- **[Related]** [category-management](../2026-10-19-category-management/spec.md), [product-management](../2026-10-19-product-management/spec.md), [stock-management](../2026-10-19-stock-management/spec.md), [product-images](../2026-10-19-product-images/spec.md) — the link targets. Stock and images live on the product edit page, so those cards link to `/admin/products`. No shared files.

## Similar Implementations

### Current dashboard

- **Location:** `apps/cms/src/app/dashboard/dashboard.component.ts`, `dashboard.component.spec.ts`
- **Key patterns:** inline template, `toSignal(HttpClient.get("/api/admin/status"))`; spec uses `provideHttpClientTesting` + `HttpTestingController.expectOne`

### Layout nav

- **Location:** `apps/cms/src/app/layout/layout.component.ts`
- **Key patterns:** `RouterLink` with relative `categories`/`products`; link classes `font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:shadow-focus`

### Page heading and panels

- **Location:** `apps/cms/src/app/products/product-list.component.html`
- **Key patterns:** h1 `font-display text-[32px] … md:text-[40px]`; panel `rounded-md border border-line bg-surface-alt p-4 md:p-6`
