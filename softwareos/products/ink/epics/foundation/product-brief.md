# Foundation — Product Brief

> Epic: epic.md · Product: ../../mission.md

## Goals

Aya can install the app, unlock it with Face ID, and move around the five tabs
(בית, מחשבון, סקיצות, לקוחות, יומן) in the final look. Her data is private and synced
across her iPhone and iPad.

## User Stories

- As Aya, when I open the app it asks for Face ID, falling back to my device passcode, so nobody else can see my clients.
- As Aya, the app locks again when it goes to the background, so a client holding my phone can't open it.
- As Aya, I sign in once per device and then only use Face ID.
- As Aya, I see the home screen with the four main actions (calculator, sketch library, clients, calendar)
  and a "next appointments" list, which is empty for now.
- As Aya, opening "My Data" (הנתונים שלי) asks me to authenticate again, even when the app is already unlocked.

## Success Criteria

- A TestFlight build runs on Aya's iPhone and iPad.
- The home screen matches `design/pages/Home.html` (and the design system) in light and dark mode.
- The app is always locked when reopened or brought back from the background.
- Hebrew right-to-left layout is correct on every screen in the shell, including numbers and ₪.

## Out of Scope

- All feature screens: tabs other than home show placeholder screens.
- Offline writes (reading from cache only, per architecture).
- Email/marketing (phase 2).
