# Product Roadmap

## Core Features (current state)

None — greenfield product.

## Phase 1: MVP

Build order (each is a candidate epic):

1. **Foundation**: monorepo scaffold, owner login, Face ID / passcode app lock with
   re-lock when the app goes to the background, extra authentication for "My Data",
   data model + migrations, iPhone/iPad sync (online-first), Hebrew RTL shell and
   design system, home screen.
2. **Clients**: create/edit (only name required), search by name/phone/Instagram,
   client card with contacts, tattoo count, computed money summary, tabs for
   tattoos / quotes / notes, recorded marketing consent.
3. **Calculator & quotes**: pricing formula, parameters, multiple tattoos per visit,
   design fee, "more options" (extra needles, discounts), copy quote without a client,
   save to client card, "book appointment" from a quote.
4. **Calendar & appointments**: center-screen modal for new/edit, pre-fill from a
   saved quote, cancel/postpone, updates propagate to every linked record.
5. **Completed tattoos & gallery**: tattoo records created automatically, one photo per
   tattoo, automatic work gallery.
6. **Sketch library & client mode**: statuses (available / reserved / done), no prices,
   client mode locked to sketches only, leaving it requires Face ID or the passcode.
7. **My Data**: "income from completed appointments", manual expenses with categories,
   computed balance, monthly chart, monthly PDF report to share with the accountant.

## Phase 2: Post-Launch

- **Email marketing**: consent-based mailing list, upload a finished newsletter
  (PDF/JPG/PNG), test email, send now or schedule, edit/cancel scheduled sends, send
  history, unsubscribe, consent re-checked at send time.
- **Full offline editing**: local writes, sync queue, conflict resolution.
- **Time-estimate learning**: calibrate the 5-parameter estimate from recorded actual
  durations.
- Out of scope for now: WhatsApp integration, healing tracking/photos.
