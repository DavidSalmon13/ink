# References for Catalog Pagination

## Related Specs

- **[Related]** [2026-10-18-product-catalog](../2026-10-18-product-catalog/spec.md) — owns /catalog, `GET /catalog/products` and the shared query (`apps/web/src/features/catalog/**`, `apps/api/src/catalog/catalog.*`, `packages/shared/src/catalog/query*.ts`). Kept separate because pagination was in its Out of Scope and it is in progress on its own branch; this spec changes its AC1 contract from "all products" to "the first page".
- **[Considered]** [2026-10-18-catalog-foundation](../2026-10-18-catalog-foundation/spec.md) — matched on `apps/api/src/catalog/**` and `packages/shared/src/catalog/**`, dismissed in Step 4d: foundation owns the schema, seed and data layer, not the endpoint's query logic.
- **[Considered]** [2026-10-18-home-page](../2026-10-18-home-page/spec.md) and [2026-10-21-shoe-finder](../2026-10-21-shoe-finder/spec.md) — matched on `apps/web/src/features/home/**` (`load-featured.ts`, `load-home-picks.ts`) and `apps/web/src/features/shoe-finder/**` (`load-shoes.ts`), dismissed in Step 4d: this spec only sets their loaders' `pageSize` (wiring edits); the features stay theirs.
- **[Considered]** [cms / admin-catalog / 2026-10-19-product-management](../../../../../cms/epics/admin-catalog/specs/2026-10-19-product-management/spec.md) and [2026-10-21-bulk-actions](../../../../../cms/epics/admin-catalog/specs/2026-10-21-bulk-actions/spec.md) — weak match on "pagination" in their Out of Scope, dismissed in Step 4d: that is the admin products list in `apps/cms`, a different concern.

## Upstream Meeting

_None._

## Similar Implementations

### Active-filter chips and canonical hrefs

- **Location:** `apps/web/src/features/catalog/ActiveFilterChips.tsx`, `apps/web/src/features/catalog/catalog-href.ts`
- **Relevance:** server-rendered `<Link>`s built from canonical params — the pattern for the pager links.
- **Key patterns:** every catalog URL goes through `catalogHref`, so dropping `page` there resets the page for SortSelect, FilterForm, the chips and NoResults at once.

### Catalog service query

- **Location:** `apps/api/src/catalog/catalog.service.ts`
- **Relevance:** where `skip`/`take`, the `count` and the tiebreaker go.
- **Key patterns:** the `Promise.all` of Prisma queries, `ORDER_BY` per sort, `baseWhere`/`groupWhere`, the in-memory facet count over all matches.

### Shared catalog query

- **Location:** `packages/shared/src/catalog/query.ts`, `packages/shared/src/catalog/query.test.ts`
- **Relevance:** where `page`/`pageSize` and the response fields are added.
- **Key patterns:** the `dollars` schema (blank → absent, coerce, int, min), `single()` for the lenient page parse, the fixed canonical key order in `catalogQueryToSearchParams`.
