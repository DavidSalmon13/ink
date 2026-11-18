# Clients — Product Brief

> Epic: epic.md · Product: ../../mission.md

## Goals

Aya's client details are scattered across chats, Instagram DMs and notes, so finding someone's phone number or
history means searching several places.

1. One record per client, quick to create mid-conversation (only the name is required).
2. Find any client in seconds by name, phone or Instagram.
3. The client card is the hub that later epics hang quotes, appointments and tattoos on.
4. Marketing consent is explicit, revocable and audited (`ConsentEvent`), ready for Phase 2 email.

## User Stories

Aya is the only user.

- As Aya, I add a client with just a name, and fill in phone, email, Instagram and notes later.
- As Aya, I search by part of a name, a phone number (with or without dashes) or an Instagram handle, and the
  list narrows as I type.
- As Aya, I open a client card and tap to call, WhatsApp or open their Instagram.
- As Aya, I record that a client agreed to (or withdrew from) marketing messages, and see when.
- As Aya, I edit or delete a client. Deleting is soft, so nothing linked breaks and the iPhone and iPad stay
  in sync.
- As Aya, on the iPad I see the list and the card side by side.

## Success Criteria

- Aya creates a client with only a name in under 10 seconds, and it appears on her other device after a refresh.
- Search by name, phone (any formatting) or Instagram finds the client, in Hebrew and Latin text.
- The client card matches `design/pages/ClientCard.html` and `ClientCard.ipad.html`. The tattoo count,
  "הכנסות לפי תורים שהסתיימו" and the next appointment show empty states until those epics land.
- Granting or revoking consent writes a `ConsentEvent` and updates `Client.marketingConsent`.
- A deleted client disappears from the list and search but stays in the database (`deletedAt`). Concurrent edits
  from the iPhone and iPad get a 409 instead of silently overwriting.
- API integration tests and mobile tests pass, and it works in Expo Go on the iPhone and iPad.

## Out of Scope

- Quotes, appointments, completed tattoos and tattoo photos on the card: they arrive with the Calculator & quotes,
  Calendar & appointments, and Completed tattoos & gallery epics. This epic only provides their tabs and
  empty states.
- Sending marketing email, campaigns and the unsubscribe page (Phase 2). This epic only records consent.
- New mockups for the clients list and the create/edit form: that's a design task (see tech plan → Risks).
