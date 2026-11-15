# Tasks — Catalog Foundation

> Epic: catalog-search
> Spec: 2026-10-18-catalog-foundation
> Branch: feat/catalog-search/catalog-foundation

## Gate

- [x] T1 (demo branch: api-foundation + auth-api-migration confirmed merged into feat/accounts-auth/auth-api-demo; built there instead of a fresh feature branch. vercel.json buildCommand is deferred (Vercel)) Check that accounts-auth `api-foundation` and the auth stack (`auth-api-migration`, including apps/api/vercel.json with `prisma migrate deploy` in `buildCommand` and .github/workflows/ci.yml with the "Migrate database" step in `apps/api`) are merged into `develop`. Then create `feat/catalog-search/catalog-foundation` from the latest `develop`. Stop if either one is still only on its feature branch (AC1, AC8).

## Tests first (TDD)

- [x] T2 Write failing Vitest tables in packages/shared/src/catalog/sizes.test.ts and packages/shared/src/catalog/enums.test.ts. Each file starts with a `// covers AC4, T2` comment.
  - Sizes: `SHOE_SIZES` has 15 entries, from "US 6" to "US 13", in order, with every half size (for example "US 9.5") and no duplicates. `APPAREL_SIZES` is exactly XS, S, M, L, XL. `GEAR_SIZES` is exactly ["One size"]. `sizesForCategory("shoes" | "apparel" | "gear")` returns the matching list, and an unknown slug throws.
  - Enums: the options of `categorySlugSchema` are shoes/apparel/gear, `runTypeSchema` is ROAD/TRAIL/RACE_DAY and `genderSchema` is MEN/WOMEN/UNISEX. Each label map covers every option ("Road", "Trail", "Race day", "Men", "Women", "Unisex", "Shoes", "Apparel", "Gear"). `safeParse` rejects lowercase or unknown values. (testing skill)
- [x] T3 Write failing apps/api/src/catalog/catalog-data.test.ts, starting with `// covers AC4, AC5, T3`.
  - Counts: exactly 30 products, 10 each in shoes/apparel/gear. Every product's `categorySlug` exists in the exported categories.
  - Slugs are unique and match `/^[a-z0-9]+(-[a-z0-9]+)*$/`. Every `priceCents` is a positive integer.
  - Each product's variant sizes equal `sizesForCategory(categorySlug)`, in order. Every stock value is a non-negative integer.
  - `artColor` and `artAccent` match `/^#[0-9a-f]{6}$/i`. Every `artKind` is a value of the Prisma `ArtKind` enum.
  - Every run type and every gender is used at least once.
  - At least 4 products are `featured`. At least 1 product has 0 stock in every size. At least 1 product with stock has at least one size at 0.
  - Every product has a non-empty `description`, and any `techNote` is non-empty.
  - Parity: the shared `runTypeSchema`/`genderSchema` options equal `Object.values` of the Prisma `RunType`/`Gender` enums. (testing skill)
- [x] T4 Write failing apps/api/src/catalog/load-catalog.test.ts with a fake Prisma that records calls, starting with `// covers AC6, T4`.
  - All writes go through one `$transaction` callback.
  - Categories are upserted by `slug` and products by `slug`, with the product connected to its category's id. Variants are upserted by the compound key `productId_size`.
  - The `update` payloads carry the same content fields as `create`.
  - A second call with the same data issues the same upserts and creates nothing extra.
  - No `delete`/`deleteMany` is ever called, including when the fake DB holds a product that isn't in the data.
  - An error thrown inside the transaction propagates, and `loadCatalog` doesn't catch it. (testing skill)
- [x] T5 Write failing apps/api/src/catalog/load-catalog.db.test.ts, starting with `// covers AC1, AC2, AC3, AC6, AC8, T5`. Follow apps/api/src/auth/session.db.test.ts: `describe.skipIf(!process.env.TEST_DATABASE_URL)`, a 60 s timeout, and a `PrismaService` built with `datasourceUrl`.
  - Run `loadCatalog` twice. Afterwards there are 3 categories and 30 products with the catalog slugs, and the variant count equals the sum from catalog-data. The counts are the same after both runs.
  - Inside a transaction that is rolled back (or with cleanup in `afterAll`): setting a variant's `stock` to -1 is rejected by the CHECK constraint, a product with `priceCents` 0 is rejected, and a duplicate `(productId, size)` is rejected.
  - Deleting a throwaway product in that rolled-back transaction cascades to its variants.
  - The test leaves no rows behind beyond the 30-product catalog, so it can run against the CI database after it has been seeded. (testing skill)
- [x] T6 Write failing apps/api/src/catalog/seed-guard.test.ts, starting with `// covers AC7, T6`.
  - `assertSeedAllowed({ VERCEL_ENV: "production" })` throws an error that names `VERCEL_ENV` and says the seed refuses production.
  - It returns normally for `"preview"`, `"development"` and an unset `VERCEL_ENV`.
  - It reads only the env object it's given, never `process.env` directly, so it can be tested without touching global state. (testing skill)

## Data layer

- [x] T7 Edit apps/api/prisma/schema.prisma (wiring edit). Add:
  - the enums `RunType` (ROAD, TRAIL, RACE_DAY), `Gender` (MEN, WOMEN, UNISEX) and `ArtKind` (shoe, tee, longsleeve, jacket, shorts, cap, socks, vest, belt)
  - `Category` (slug unique, name, sortOrder)
  - `Product` with every AC2 field, `@@index` on categoryId, runType, gender and priceCents, and `featured`/`isNew` defaulting to false
  - `ProductVariant` (productId, size, sortOrder, stock default 0, `@@unique([productId, size])`, `onDelete: Cascade`)

  Then generate apps/api/prisma/migrations/<ts>_catalog/migration.sql with `prisma migrate dev --name catalog`. Add `CHECK ("priceCents" > 0)` and `CHECK ("stock" >= 0)` to it by hand as named constraints. Check that the SQL only creates types, tables and indexes, with no `ALTER`/`DROP` on User, Session or AuthAttempt. Check that `prisma migrate deploy` works on an empty database and on one that already has the auth migrations (AC1, AC2, AC3).
- [x] T8 Add packages/shared/src/catalog/sizes.ts (`SHOE_SIZES`, `APPAREL_SIZES`, `GEAR_SIZES`, `sizesForCategory`) and packages/shared/src/catalog/enums.ts (`categorySlugSchema`, `runTypeSchema`, `genderSchema` as `z.enum`, plus `CATEGORY_LABELS`, `RUN_TYPE_LABELS`, `GENDER_LABELS` and the inferred types). Add packages/shared/src/catalog/index.ts as a barrel, following packages/shared/src/auth/index.ts, and add `export * from "./catalog";` to packages/shared/src/index.ts. No Prisma import in shared (AC4). T2 goes green.
- [x] T9 Add apps/api/src/catalog/catalog-data.ts with the `CatalogEntry` type, the 3 categories (shoes/apparel/gear, with sortOrder) and the 30 products from the `products` array in stride-design/pages/Catalog.dc.html.
  - From the design, copy name, sub as `subtitle`, run type mapped to `RunType`, gender mapped to `Gender`, price × 100 as `priceCents`, tag as `beginnerTag`, and `art` kind/colour/accent. The `stone` background isn't stored.
  - Slugs are kebab-case names, for example "pace-5-running-shorts".
  - Write a `description` in the Product.dc.html voice (one plain sentence) and an optional `techNote` ("For the technical crowd: …").
  - Variants come from `sizesForCategory` with explicit per-size stock.
  - Mark at least 4 products `featured` and a few `isNew`.
  - Thermal Long-Sleeve Top is fully sold out, as in the design. At least one in-stock shoe (for example Stride Glide Road Shoe, following the Product.dc.html stock map) has some sizes at 0.
  - `imageUrl` stays unset (AC5). T3 goes green.
- [x] T10 Add apps/api/src/catalog/load-catalog.ts. `loadCatalog(prisma, data = catalogData)` runs in a single `prisma.$transaction(async (tx) => …)`:
  - upsert categories by slug
  - upsert products by slug, using the category id from the upsert result
  - upsert variants by `productId_size`, with stock and sortOrder in both create and update
  - never delete
  - return `{ categories, products, variants }` counts

  It's a plain function with no Nest module or provider and no route, so launch-polish can import it. Check that the interactive transaction stays inside Prisma's default timeout for about 30 products. If it doesn't, pass an explicit `timeout` and say so in a code comment (AC6, AC9). T4 and T5 go green.
- [x] T11 Add apps/api/src/catalog/seed-guard.ts (`assertSeedAllowed(env)`) and apps/api/prisma/seed.ts.
  - seed.ts is a thin script: call `assertSeedAllowed(process.env)` before constructing any client, then `new PrismaClient()`, `loadCatalog`, log the counts, and `$disconnect` in `finally`.
  - On any error, print the message and set `process.exitCode = 1`. Because the guard runs before any client exists, production writes nothing (AC7). T6 goes green.

## Wiring (wiring edits)

- [x] T12 Edit apps/api/package.json: add `"prisma": { "seed": "tsx prisma/seed.ts" }` and add `tsx` as an exact-pinned devDependency (`npm i -D -E tsx -w @stride/api`, no `^`). Commit the updated root package-lock.json. Locally, check that `npx prisma db seed` in apps/api seeds a migrated database, that running it again changes nothing, and that `VERCEL_ENV=production npx prisma db seed` exits non-zero (AC7).
- [ ] T13 (deferred (Vercel) — apps/api/vercel.json has no buildCommand on the demo branch yet) Edit apps/api/vercel.json: append `&& if [ "$VERCEL_ENV" = "preview" ]; then prisma db seed; fi` to `buildCommand` so the seed runs after `prisma migrate deploy`. Keep the existing `DIRECT_URL` prefix on the migrate step. In the PR, note that the seed connects with the pooled `DATABASE_URL`, and confirm on the PR's API preview that the build log shows the seed counts and that a Production build skips the seed (AC8).
- [x] T14 Edit .github/workflows/ci.yml: add a "Seed database" step (`working-directory: apps/api`, `run: npx prisma db seed`) right after "Migrate database" and before "Unit tests", so T5 runs against a seeded database (AC8).

## Docs (wiring edits)

- [x] T15 Check softwareos/products/stride/architecture.md. It already lists Category, Product and ProductVariant (size + stock), so edit it only if something is missing. The one candidate is a single line saying that product images render from ProductArt data (`artKind`/`artColor`/`artAccent`) and that `imageUrl` is nullable for future photos. Otherwise leave the file unchanged and record "no change needed" in the PR (AC9).
- [x] T16 Edit softwareos/products/stride/epics/catalog-search/tech-plan.md:
  - The `catalog-foundation` candidate line: Prisma schema (Category/Product/ProductVariant + RunType/Gender/ArtKind enums, CHECK constraints), shared sizes/enums in `@stride/shared`, `apps/api/src/catalog/catalog-data.ts` + idempotent `loadCatalog`, and a guarded preview/CI seed.
  - The Approach and Architecture Impact lines: products render ProductArt data with a nullable `imageUrl`, not images in /public, and the catalog data file is `apps/api/src/catalog/catalog-data.ts`, not `apps/api/prisma/catalog-data.ts`.

## Verification

- [x] T17 (2026-10-18 local: typecheck + all unit/db tests green against Neon dev; e2e 12 passed / 13 env-skipped; lint green except a Prettier warning in packages/shared/src/account-security/index.ts, which was already there and is outside this spec) Run the full suites green: `npm run lint`, `npm run typecheck`, `npm test` (shared + api + web, with `TEST_DATABASE_URL` set so the `*.db.test.ts` files run, including T5 and the existing session/throttle db tests) and Playwright e2e in CI. Check that every new test file has its `covers AC<n>, T<n>` comment (testing skill)
- [ ] T18 Run QA against acceptance criteria AC1–AC9 (qa skill). For AC9, also check that the diff has no changes under `apps/web/`, no new controller or module in apps/api/src/app.module.ts, and that the only files touched are the ones in the spec's Covers list plus the wiring edits in T7 and T12–T16.
