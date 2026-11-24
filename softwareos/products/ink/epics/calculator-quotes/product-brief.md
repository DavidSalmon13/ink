# Calculator & Quotes — Product Brief

> Epic: epic.md · Product: ../../mission.md

## Goals

**Problem:** Aya prices visits by hand or in her head, so prices are inconsistent, and quotes she sends get lost.

**Goals:**

1. One consistent price from the formula: 350 ₪ minimum including the first 30 minutes, then 5.5 ₪ per minute,
   plus the custom-design fee, extra needles, a discount, or a manual price override
   ([data-model.md](../../data-model.md) → Quote / QuoteItem).
2. Several tattoos per visit, each with a time estimate she can override.
3. Copy a quote to send to someone without choosing a client.
4. Save quotes to the client card. Quotes never expire, so they can be booked later.

## User Stories

As Aya:

- I add one or more tattoos (size, detail, shading, placement, design source) and see the visit's time and price
  update instantly.
- I can override any tattoo's estimated minutes, and I see a hint such as "דומה: ורד ≈ 60 דק׳".
- I can add a custom-design fee by hours, extra needles, a % or ₪ discount, or a manual final price.
- I copy the quote text to paste into WhatsApp or Instagram, with no client chosen.
- I pick or create a client and save the quote, and it appears in the client card's Quotes tab.
- I can open, edit or delete a saved quote.
- From a saved quote I tap "קביעת תור" to start booking.

## Success Criteria

- The app's preview and the API agree on the minutes and the price for a shared set of test vectors, including the
  calibration points (rose M simple = 60 min, arm XL = 180 min).
- The summary breakdown (visit duration, base price, design fee, extra needles, discount, total) matches
  `design/pages/Calculator.html` in RTL on iPhone and iPad.
- Copying works with no client and saves nothing.
- A saved quote shows on the client card with its total, and reopening it reproduces the same numbers.
- Saving a quote never creates an appointment.
- All money is integer agorot; no prices appear on sketches.
- Aya prices 3 real past visits with the calculator and accepts the results.

## Out of Scope

- Editing the rates and estimate tables in Settings (this epic uses the seeded `Settings` row as is).
- The booking flow itself: the appointment modal, pre-fill from a quote, and several appointments per quote belong
  to the Calendar & appointments epic. This epic only provides the "קביעת תור" entry point.
