# References for Catalog Foundation

## Related Specs

_None._ The pre-flight check (all epics) found no spec claiming these paths. `apps/api/prisma/schema.prisma` belongs to accounts-auth `api-foundation`; this spec only adds models to it, as a wiring edit.

## Upstream Meeting

None.

## Similar Implementations

### Design handoff: the catalog content

- **Location:** `stride-design/pages/Catalog.dc.html` (the `products` array) and `stride-design/pages/Product.dc.html`, `ProductSoldOut.dc.html`
- **Relevance:** defines exactly the 30 products (10 Shoes, 10 Apparel, 10 Gear) with name, subtitle, category, run type, gender, price, guidance tag and art colours. The product pages show the description voice (one plain sentence plus an optional "For the technical crowd: …" note) and the size and sold-out states.
- **Key patterns:** copy the records into `catalog-data.ts`, with prices × 100 as cents. Thermal Long-Sleeve Top is the fully sold-out product.

### Design handoff: ProductArt

- **Location:** `stride-design/design-system/components/ProductArt/README.md`, `index.d.ts` (`ProductArtProps`, `ArtKind`)
- **Relevance:** the illustrated SVG used wherever a product photo will go, until real photos exist. It's why products store `artKind`, `artColor` and `artAccent`, and why `imageUrl` is nullable.

### Existing code patterns

- `apps/api/prisma/schema.prisma` and `migrations/*_init_auth`: model and migration style
- `apps/api/src/prisma/prisma.service.ts`: the Prisma client used by tests (`datasourceUrl`)
- `apps/api/src/auth/session.db.test.ts`: the `TEST_DATABASE_URL` test pattern (`describe.skipIf`, timeouts, cleanup)
- `packages/shared/src/auth/`: shared Zod module with a barrel export
- `.github/workflows/ci.yml` "Migrate database" step and `apps/api/vercel.json` `buildCommand` (on the api-foundation and auth-api-migration branches until they merge)

## Wiring edits (files other specs own)

`apps/api/prisma/schema.prisma`, `apps/api/package.json` + root `package-lock.json`, `apps/api/vercel.json`, `.github/workflows/ci.yml`, `packages/shared/src/index.ts`, `softwareos/products/stride/architecture.md`, `softwareos/products/stride/epics/catalog-search/tech-plan.md`.

## Known doc drift

`catalog-search/product-brief.md` ("images from /public") and `softwareos/standards/global/tech-stack.md` (product images in the repo under /public) still describe photo files. This spec uses ProductArt data until real photos exist. T16 fixes the tech plan; align the brief and the standard later with `/update-arch`.
