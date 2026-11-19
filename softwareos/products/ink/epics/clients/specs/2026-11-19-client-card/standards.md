# Standards for Client Card

The following standards apply to this work.

---

## global/git-workflow


## Base branch

Branch off `main` and open every PR against `main`.

## Branch naming

One branch per spec, named from the SoftwareOS slugs (no date prefixes):

```
feat/<epic-slug>/<spec-slug>          # spec work — the canonical branch
feat/<epic-slug>/<spec-slug>--t<id>   # parallel work on one spec, split by task
hotfix/<epic-slug>/<bug-slug>         # bug fixes
chore/<slug>                          # everything else
```

- The canonical branch is recorded in the spec's `tasks.md` `> Branch:` line. To map a branch to a spec: match that line first; fall back to suffix-matching `<spec-slug>` against `feat/*/`.
- Slugs are load-bearing — never rename an epic or spec after branches exist.
- Never commit on `main`. Branch first.

## Commits

Conventional-commit-ish titles, scoped to the epic:

```
feat(<epic-slug>): add password reset endpoint
fix(<epic-slug>): handle expired reset tokens
chore: bump CI node version
```

- Small, focused commits. Reference task IDs in the body when useful (`T3`, `T4.1`).
- **Never `git commit --no-verify`.** Failing hooks mean fix the cause, not skip the check.
- No force pushes to the default branch.

## Pull requests

- Open PRs with the **pr** skill — it runs verification, builds the title (`feat(<epic-slug>): <spec title>` / `fix(<epic-slug>): <bug title>`) and body from the spec, and writes the PR URL back to `tasks.md`.
- Tasks incomplete → open as draft.

## Production mode

When `softwareos/config.yml` has `mode: production`, the workflow tightens:

- **Git itself is never gated.** Commit and push as usual — pushing is how CI runs and how a branch gets reviewed, so blocking it would obstruct the verification the mode is asking for. The gates live in the tools that can actually check something.
- **A PR needs a passing `qa-report.md` and a recorded `> Reviewed:` line** (written by `/code-review`) before the pr skill will open it. A draft PR is for incomplete work, not for skipping verification.
- **Unfixed HIGH or CRITICAL review findings block the merge**, rather than being advice.

`/go-production` makes this transition and records any waivers; `/go-production --revert` goes back. Neither is a quiet config edit — both leave an entry in `softwareos/production-readiness.md`.

---

## frontend/design-fidelity


The design in `design/` is the source of truth for every screen. Frontend work copies it;
it doesn't reinterpret it.

## Sources

- `design/design-system/tokens.json`: every color, font size, spacing, radius, shadow, z-layer and touch size
- `design/design-system/design-system.html`: component look and states (buttons, inputs, modal, toasts, empty/loading/error)
- `design/pages/<Screen>.html` (iPhone 393×852) and `<Screen>.ipad.html` (iPad landscape 1180×820)
- `design/design-system/README.md`: notes for the React Native build

## Specs (`/shape-spec`)

- Every spec that touches UI lists the matching `design/pages/*.html` file(s) in `references.md`
  under **Design**, and its UI tasks name the page they implement.
- If a screen or state has no mockup, say so in the spec and either:
  build it from existing components and tokens only, **or** add the mockup to `design/` first.
  Never invent a new visual style inside a task.

## Implementation

- Styles come only from `tokens.json` (via the app's theme module). No hard-coded hex colors, font sizes,
  spacing or radii in components.
- Reuse the design-system components; a new component must look like it belongs on `design-system.html`.
- Right-to-left: logical sides only (`start`/`end`, `marginStart`, `paddingEnd`), never `left`/`right`.
  Numbers, times and ₪ amounts go in their own `<Text>` (isolated left-to-right runs). Inputs for them
  (phone, price, time, size) use `<Field ltr>`, or digits separated by spaces display in reversed groups.
- Use the Hebrew wording from the mockup exactly (e.g. "הכנסות לפי תורים שהסתיימו").
- Support light and dark mode with the tokens' paired values.
- Status is never shown by color alone: every status dot has a text label.

## Done means

A UI task can be ticked only when:

1. The screen matches its cited page in layout, hierarchy, spacing, typography and Hebrew text,
   on iPhone, and on iPad when an `.ipad.html` exists.
2. Every state the mockup or design system shows works: empty, loading, error, disabled, and modal open.
3. A screenshot from the simulator is compared side by side with the mockup, and any deviation
   is either fixed or recorded in the spec's Changelog with a reason.
