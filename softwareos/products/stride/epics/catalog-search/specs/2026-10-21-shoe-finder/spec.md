# Shoe Finder Chat

> Epic: ../../epic.md
> Status: in-progress
> Branch: feat/catalog-search/shoe-finder
> Covers: apps/web/src/features/shoe-finder/**, apps/web/e2e/shoe-finder.spec.ts

## Overview

A chat-style "Stride Shoe Guide" on the home page and /catalog helps beginners who don't know what to buy. It asks 5 multiple-choice questions and answers with 3 shoe picks, each with a plain-language reason and a size suggestion. It serves the epic goal "let shoppers find what fits them fast" for people who can't use spec filters.

This is a **demo**: the user's answers filter the existing catalog endpoint, and the top 3 matches in featured order are shown (the store's hand-picked shoes first, then A–Z). The mission lists recommendations and a size quiz as v1 Scope OUT; this demo is a recorded exception (`../../../../mission.md`, 2026-10-21). The production version — code filters the hard rules, then an LLM ranks the shortlist and writes the reasons — is future work. No API change: the browser reads `GET /api/catalog/products`.

## Goals & User Stories

- As a beginner runner, I can open "Help me choose" on the home page or catalog and talk to a clearly labeled assistant, so I get guidance without knowing running jargon.
- As a shopper, I answer by tapping chips, and my choice appears as my own chat bubble.
- As a shopper, I get 3 shoes that match where I'll run, my sizing and my budget, each with why it was picked and which size to take.
- As a shopper, I can open a pick's product page, see all matching shoes in the catalog, or start over.

## Acceptance Criteria

1. AC1: On `/` and `/catalog` a fixed "Help me choose" button (bottom-right) opens the chat panel; it isn't rendered on other pages. The panel closes with its close button or Escape, and focus returns to the launcher.
2. AC2: The panel header reads "Stride Shoe Guide" with an "Assistant" label and the line "An automated guide, not a person". No human name or photo.
3. AC3: The guide greets the user, then asks in order, each as a guide bubble followed by answer chips:
   1. Where will you run mostly? Streets/sidewalks · Treadmill · Trails/dirt paths · Not sure yet
   2. Will you also wear them for anything else? Running only · Also walking/everyday · Also gym workouts
   3. What size do you wear in everyday sneakers? Men's · Women's, then US 6–13 incl. half sizes (the catalog's shoe range)
   4. What's your budget? Under $100 · $100–$130 · Over $130 · No limit
4. AC4: Tapping a chip removes the chips and shows the answer as a user bubble (right-aligned). The next guide bubble appears after a short typing indicator (~600 ms; no animation under `prefers-reduced-motion`).
5. AC5: After Q4 the guide shows up to 3 result cards, picked from in-stock shoes (category shoes, not sold out) that match on the effective (sale) price:
   - surface: Streets/Treadmill/Not sure → road, Trails → trail; race-day shoes are never picked
   - sizing: Men's → men + unisex, Women's → women + unisex
   - budget: Under $100 → max 99, $100–$130 → max 130, Over $130 → min 130, No limit → none

   Matches are ranked in the catalog's featured order (featured shoes first, then by name) and the first 3 are shown, so the same answers always give the same picks. If fewer than 3 match, it drops the budget first, then the surface (never the sizing), and fills the remaining slots from the relaxed matches in the same order, with no duplicates.
6. AC6: Each result card shows the product image/art, name, `PriceTag` (sale price when on sale), one "Why" line and a size line, and links to `/product/[slug]`.
   - Why: built for road/trail + "within your budget", or "a little over your budget" when the budget was relaxed.
   - Size: "Try US Men's 10.5: half a size up from your everyday 10 for toe room" (capped at 13: "Try US Men's 13").
7. AC7: Answer-driven notes appear once under the results: gym → "Running shoes are soft, so for lifting weights a flat shoe is steadier."
8. AC8: Under the results, "See all matching shoes" links to `/catalog` with the same category/run/gender/price filters, and "Start over" clears the chat and asks Q1 again.
9. AC9: If the catalog request fails, the guide says it couldn't load shoes and offers "Browse shoes" (`/catalog?category=shoes`) and "Try again". If nothing matches even after relaxing, it says so and offers "Browse shoes".
10. AC10: Accessible: the panel is a labeled dialog, messages live in a polite `role="log"`, chips are buttons reachable by keyboard, focus moves to the first chip of each question, and the panel works at 360px width.

## Technical Approach

- New feature folder `apps/web/src/features/shoe-finder/`:
  - `questions.ts` — question/answer definitions (ids, labels) as typed constants.
  - `recommend.ts` — pure functions: `answersToQuery(answers): Partial<CatalogQuery>`, `pickShoes(products, answers)` (drops sold-out, relaxes budget then run per AC5 by re-filtering the loaded list, keeps the API's order and returns the first 3), `sizeSuggestion(gender, size)`, `whyLine(product, relaxed)`, `notesFor(answers)`.
  - `load-shoes.ts` — browser `fetch('/api/catalog/products?category=shoes&gender=…&sort=featured')` (the response order is the ranking) using `catalogQueryToSearchParams` and `catalogProductsResponseSchema`. Loads the shoes for the chosen sizing once; `pickShoes` applies run/budget and relaxing in memory (~10 shoes, so this is cheap and avoids three requests).
  - `ShoeFinderChat.tsx` (client) — reducer-driven step machine (greeting → q1…q4 → loading → results | error | empty), message list, typing delay via timeout.
  - `MessageBubble.tsx`, `AnswerChips.tsx`, `TypingIndicator.tsx`, `ResultCard.tsx` (compact card reusing `ProductImage` and `PriceTag`).
  - `ShoeFinderLauncher.tsx` (client) — the fixed button and the panel's open/close/focus handling.
- Mount `<ShoeFinderLauncher />` with one line each in `apps/web/src/app/page.tsx` and `apps/web/src/app/catalog/page.tsx`.
- No Server Actions (tech-stack standard), no new endpoint, no persistence: state lives in the component and resets on reload.
- Styling: existing Tailwind tokens (`bg-surface`, `bg-volt-soft`, `rounded-pill`, `shadow-focus`, chip styles from `FeaturedTabs`).
- Ships as one code PR (~14 files), separate from the docs PR.

## Out of Scope

- LLM ranking and LLM-written reasons (production idea: code hard-filters, the LLM picks from the shortlist and returns product IDs + reasons).
- Personalized ranking beyond featured order (match scores, LLM ranking).
- Using width or per-size stock in picking (the catalog has no width data).
- Asking for the shopper's usual brand (removed 2026-10-22: it never changed the picks or any text).
- Free-text chat input, persisting answers, analytics / A-B measurement.
- Showing the chat on product, auth or account pages.
- Adding to cart from the chat.

## Standards Applied

- [global/tech-stack](../../../../../../standards/global/tech-stack.md) — browser reads via `/api/*`, no Server Actions for data, shared Zod, client components only where needed.
- [global/git-workflow](../../../../../../standards/global/git-workflow.md) — branch and PR conventions.

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-10-21 | david-schwartzman | created | Initial shaping | — |
| 2026-10-21 | david-schwartzman | change | Picks are the top 3 matches in featured order (featured first, then by name) instead of a random 3; filter and fallback unchanged — a predictable ranking is easier to explain in the demo and puts the store's hand-picked beginner shoes first | — |
| 2026-10-22 | david-schwartzman | change | Removed the optional brand question from Q3 (sizing → size → width now) — brand was collected but never used in picking, the Why line or the notes, so it only added a step | — |
| 2026-10-26 | david-schwartzman | change | Removed the foot-width question (Q4 "Do regular shoes often feel tight…") and its wide-feet note — the catalog has no width data, so it never affected the picks; budget is now Q4 | — |
