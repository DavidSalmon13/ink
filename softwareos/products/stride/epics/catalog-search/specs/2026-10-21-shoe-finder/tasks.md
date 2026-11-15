# Tasks — Shoe Finder Chat

> Epic: catalog-search
> Spec: 2026-10-21-shoe-finder
> Branch: feat/catalog-search/shoe-finder

## Recommendation logic

- [x] T1 Add failing tests for answersToQuery, pickShoes (filter, relax order, featured-order top 3 without duplicates, sold-out), sizeSuggestion, whyLine and notesFor (apps/web/src/features/shoe-finder/recommend.test.ts) — AC5–AC7
- [x] T2 Implement questions.ts and recommend.ts to pass T1
- [x] T3 Implement load-shoes.ts (fetch /api/catalog/products, parse with catalogProductsResponseSchema) with a unit test for the error path — AC9

## Chat UI

- [x] T4 Add failing component tests for ShoeFinderChat: assistant header, Q1→Q5 order, chip → user bubble, typing indicator, results, notes, start over, error/empty states (ShoeFinderChat.test.tsx) — AC2–AC4, AC6–AC9
- [x] T5 Implement ShoeFinderChat, MessageBubble, AnswerChips, TypingIndicator, ResultCard to pass T4 — AC10
- [x] T6 Add ShoeFinderLauncher (open/close, Escape, focus return) with a test, and mount it in apps/web/src/app/page.tsx and apps/web/src/app/catalog/page.tsx — AC1

## Verification

- [x] T7 Add Playwright e2e apps/web/e2e/shoe-finder.spec.ts: home → open → answer 5 → 3 cards → open a product; not shown on /product (testing skill)
- [ ] T8 Run QA against acceptance criteria (qa skill) — deferred (demo)

## Change 2026-10-22: remove the brand question

- [x] T9 Update tests first: drop the brand prompt and "Skip"/"Nike" answers from ShoeFinderChat.test.tsx, `brand` from the recommend.test.ts answers fixture, and "Skip" from e2e/shoe-finder.spec.ts — AC3
- [x] T10 Remove the brand step, BRANDS, Brand and Answers.brand from questions.ts to pass T9; run unit tests and the shoe-finder e2e (testing skill) — AC3
