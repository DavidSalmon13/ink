# Ink

A private studio-management app (CRM) for a solo tattoo artist: Hebrew right-to-left UI, iPhone and iPad.
Planned with SoftwareOS. Start with `softwareos/README.md`, or run `/explain-os`.

## Where things are

- Product docs: `softwareos/products/ink/` (mission, roadmap, tech-stack, architecture, dependencies, data-model)
- Original product spec (Hebrew): `AYA_INK_new.docx`. Where it differs from `data-model.md`, `data-model.md` wins.
- Design: `design/design-system/` (tokens + component sheet) and `design/pages/` (screen mockups)
- Standards: `softwareos/standards/` (see `index.yml`)

## Stack

`apps/mobile`: Expo + TypeScript · `apps/api`: Spring Boot 3, Java 21 · PostgreSQL · Cloudflare R2 · Railway

## Rules

- **Frontend copies the design.** Before any UI work, read the cited `design/pages/*.html` and
  `design/design-system/tokens.json`, and follow `softwareos/standards/frontend/design-fidelity.md`.
  Every UI spec cites its pages in `references.md`.
- Money is integer agorot. Months and "has the appointment passed" are evaluated in `Asia/Jerusalem`.
- Income is always "הכנסות לפי תורים שהסתיימו", never "actual income"; no money on the home screen; no prices on sketches.
- Client mode is a security boundary: sketches only, and leaving it requires authentication.
- See `softwareos/products/ink/architecture.md` → Gotchas before changing code.
