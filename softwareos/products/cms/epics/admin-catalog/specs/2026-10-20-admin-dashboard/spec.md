# Admin Dashboard

> Epic: ../../epic.md
> Status: in-progress
> Branch: feat/admin-catalog/admin-dashboard
> Covers: apps/cms/src/app/dashboard/**

## Overview

Replaces admin-foundation's empty dashboard at `/admin` with a short landing page. It has one line on what the CMS is for and a card for each area (Categories, Products, Stock, Images), each with a one-sentence description and a link. Stock and images live on the product edit page, so their cards link to Products. This revises the "empty dashboard" wording in admin-foundation AC7. Everything else in AC7 (the shell, tokens, deep-link reloads) is unchanged. It serves the brief's goal that an admin can do every story with no developer, because the first screen now shows where each task lives. Built on the local branch `feat/admin-catalog/product-images` (user choice, 2026-10-20). A PR later gets its own branch.

## Goals & User Stories

- As an admin, when I open `/admin` I see what the CMS is for and where each task lives, instead of "Nothing to manage yet."
- As an admin, I can reach categories or products in one click from the landing page

## Acceptance Criteria

1. AC1: `/admin` shows the "Dashboard" heading, then one purpose line: "Manage the Stride catalog. Changes you save here show in the store on the shopper's next page load." "Nothing to manage yet" no longer appears.
2. AC2: Below it are four cards in this order, each with a heading, one sentence and a link:
   - Categories: "Add, rename and reorder the categories shoppers browse by." → "Manage categories" (`/admin/categories`)
   - Products: "Add products, edit their details and sizes, or remove them." → "Manage products" (`/admin/products`)
   - Stock: "Set stock for each size, or mark a product out of stock. Open a product to find its Stock panel." → "Update stock" (`/admin/products`)
   - Images: "Upload, replace or remove a product's photo. Open a product to find its Image panel." → "Update images" (`/admin/products`)
3. AC3: The links are in-app router links (no full reload) with visible focus styles. Cards stack in one column at phone width, with no horizontal scroll at 375px, and use two or more columns from `md` up. Only Stride tokens are used.
4. AC4: The page still calls `GET /api/admin/status` once (admin-foundation's end-to-end guard check). The existing admin e2e suites and CI pass unchanged.

## Technical Approach

- `dashboard.component.ts` keeps the inline template and the `status` signal. It imports `RouterLink`. The cards are a `<ul>` of `<li>`s, each with an `<h2>`, a `<p>` and an `<a routerLink>`. `categories`/`products` are relative to the guarded `''` route, so they resolve to `/admin/categories` and `/admin/products` under the `/admin/` base href.
- The cards are static data: a readonly array in the component rendered with `@for`, so the copy lives in one place.
- Styling copies existing CMS classes: the heading from `product-list.component.html`, the panel look (`rounded-md border border-line bg-surface-alt p-4 md:p-6`) from the filter form, and the link/focus classes from `layout.component.ts`. Grid: `grid gap-4 md:grid-cols-2`.
- No API, route, shared or web changes. `app.routes.ts` is unchanged. No counts (out of scope).

## Out of Scope

- Live counts or alerts (e.g. product total, out-of-stock count). They need a new API endpoint, so they belong in a follow-up spec
- Tutorials or long help text
- Adding Stock/Images to the layout nav, or redirecting `/admin`

## Standards Applied

- [global/auth-security](../../../../../../standards/global/auth-security.md) — the Angular guard is UX only, the API admin guard stays the enforcement point (keep the status call), and no secrets go in the CMS bundle
- [global/tech-stack](../../../../../../standards/global/tech-stack.md) — the Angular CMS is served by web at `/admin/*` and uses Stride tokens

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-10-20 | david-schwartzman | created | Initial shaping | — |
