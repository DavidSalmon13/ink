---
name: implement-next-task
description: Implements the next open task(s) of the current spec — resolves the spec from the branch, reads spec.md / standards / design refs, follows the spec's test mode (TDD via the testing skill), makes the change, verifies, ticks tasks.md and commits per task. Decides how many tasks fit in one run and stops cleanly at human-only steps, spec ambiguities, or the QA task. Use whenever the user wants to build, implement, continue, or resume work on a shaped spec or epic — "implement the next task", "continue the spec", "work on T3", "start building accounts-auth", "pick up where we left off", "keep going" — even if they don't name the skill. Not for shaping specs (/shape-spec), changing a spec's contract (/spec-changes), bug reports (/hotfix), QA sign-off (qa), or opening a PR (pr).
---

# Implement Next Task

Turn a shaped spec into working, committed code — one task at a time, in `tasks.md` order, with `tasks.md` as the durable record of progress. The spec is the contract: this skill implements it, it never rewrites it.

## Important Guidelines

- **Always use AskUserQuestion tool** when asking the user anything; one question at a time.
- **The spec is the source of truth.** If the code needs something the spec doesn't say, or the spec contradicts itself, stop and point to `/spec-changes`. Silently "fixing" the contract leaves `spec.md`, QA and review describing something other than what shipped.
- **Never commit on `develop` or `main`, never `--no-verify`, never push.** Pushing and PRs belong to the `pr` skill (`softwareos/standards/global/git-workflow.md`).
- **Project agents and skills only** (per CLAUDE.md): `testing`, `qa`, `pr`, `/verify`, and the agents in `.claude/agents/` (`tdd-guide`, `build-error-resolver`, `code-explorer`, …). Never a global `~/.claude` one.
- **`tasks.md` must always tell the truth.** `[x]` means done and verified; `[~]` means started but not finished. The next run — possibly a different person or session — resumes from it.

## Arguments

- none — pick the first open task in order.
- `T<n>` / `T<n>.<m>` — start at that task. If earlier tasks are still open, say which and ask whether to proceed out of order (task order usually encodes dependencies).

## Process

### Step 1: Resolve the Spec from the Branch

`git branch --show-current`, strip any `--t<id>` suffix, then:

- **Exact:** grep `^> Branch: ` in `softwareos/products/*/epics/*/specs/*/tasks.md` (and legacy `softwareos/epics/*/specs/*/tasks.md`) for the branch.
- **Fallback:** suffix-match `<spec-slug>` from `feat/<epic-slug>/<spec-slug>` against spec folder names.

If the branch is the default branch (`default_branch` in `softwareos/config.yml`, fallback `main`) or `main`:

```
You're on <branch> — implementation needs a spec branch. Which spec?

1. <epic>/<first shaped spec in epic.md order> (recommended — next in the epic)
2. <other shaped / in-progress specs…>
```

Then `git fetch origin` and `git switch --no-track -c <the spec's > Branch: value> origin/<default_branch>` (or `git switch` if it already exists).

Any other non-matching branch (e.g. an `integration/*` branch): ask — use it anyway (pick a spec), switch to the spec's branch, or cancel. Don't guess: commits on the wrong branch end up in the wrong PR.

With `--t<id>` parallel branches, only work on tasks assigned to that branch (the `<id>` suffix); leave the rest to their own branches.

### Step 2: Preflight

| Check | If it fails |
|---|---|
| Working tree clean, or only uncommitted changes belonging to this spec's in-progress `[~]` task | Stop — ask the user to commit or stash unrelated changes, so per-task commits stay clean |
| Spec `> Status:` is `shaped` or `in-progress` | `done` → nothing to do (suggest `/spec-changes` for new work); missing/other → ask |
| `## Prerequisites` tasks or text naming earlier specs/branches are satisfied (those branches merged into the default branch: after the `git fetch origin` above — run it now if you skipped Step 1's switch — check `git branch -r --merged origin/<default>`) | Stop — name what's missing; implementing on top of unmerged foundations creates conflicts |
| There is at least one open `[ ]` / `[~]` task | Report the spec is complete; suggest `qa` → `pr` |

Read the mode per `/go-production` → [Reading the mode](../../commands/softwareos/go-production.md#reading-the-mode). In `production`, verify must be fully green to tick a task, and tests the spec calls for are never skipped. In `setup`, the same is the default — but the user may waive a red check explicitly.

### Step 3: Load Context — Once

Read, in this order, and keep notes short:

1. `spec.md` — Acceptance Criteria (AC1…), Technical Approach, Out of Scope, `> Covers:`, latest Changelog rows.
2. `tasks.md` — all tasks and their states (finished tasks tell you what already exists).
3. `standards.md` and `references.md` in the spec folder, then only the `softwareos/standards/**` files they name.
4. Only the design files the open tasks or ACs cite (e.g. `stride-design/pages/Login.dc.html`, `stride-design/design-system/...`). Don't read the whole design folder.
5. The existing code the next tasks touch (if any). For broad unfamiliar areas, dispatch `code-explorer` and keep only its summary.

Context is the budget this skill spends — every file read stays in the conversation. Read what the batch needs, not everything that might be relevant.

### Step 4: Infer the Test Mode

Specs don't record test mode as a field; infer it from `tasks.md` and say it in one line (`Test mode: tdd — tasks.md has a "Tests first (TDD)" group`):

- **tdd** — a `## Tests first (TDD)` group, or a task like "Write tests first (testing skill)…". Tests for a task's ACs are written failing before its implementation.
- **after** — a task like "Write Vitest tests for …" that comes after the implementation tasks. Implement now; tests come when that task is reached.
- **none** — the Verification group only holds QA. Still run whatever checks exist.

If a TDD test task sits *after* the implementation tasks it covers (e.g. in Verification), still do it first for the tasks it covers — that's what "tests first" means — and say so.

### Step 5: Plan the Run (Adaptive Batch)

You can't see how full your context is, so plan conservatively from the task list instead. List the open tasks in order with a rough size and flags:

```
Open tasks (app-foundation, test mode: after):
  T1  Scaffold Next.js app …                  L
  T2  Prettier + scripts                       S
  T3  Vitest + Playwright config               M
  T4  .env.example + gitignore                 S
  T5  Prisma schema + db client                S
  T6  Link Vercel + Neon                       — human-only
```

Sizes: **S** = one or two small files; **M** = a few files or one non-trivial component; **L** = scaffolding, many files, a long install/build, or heavy design porting.

Pick the batch by walking forward from the first open task, and stop *before* any of these:

- a **human-only** task (Step 7);
- a task you can already see is **ambiguous** or contradicts the spec;
- a **QA** task, or any task in Verification other than writing/running tests;
- the start of a new `##` group, once at least one M/L task is done (groups are natural review points);
- the budget is spent. Count points: **S = 1, M = 2, L = 3**, and keep the batch at **6 points or fewer, and 5 tasks or fewer**. For example, L+S+M (6) fits and so does L+S+S+S (6); L+L (6) fits on points but treat it as the limit; M+M+M+S (7) doesn't fit.

A large task doesn't end the run by itself. Small follow-up tasks in the same group are usually cheap and touch what you just built, so doing them while it's fresh beats starting a new run. The budget exists to keep the context lean.

After each task, re-check. End the run after the current task, even if the batch had more, when:
- the task took more than one fix cycle;
- it was delegated and the subagent's result needed rework;
- it produced a lot of output (long install or build logs, big diffs you had to read);
- it turned out bigger than you sized it.

Ending early costs nothing, because the next run resumes from `tasks.md`.

**Keep the main context lean.** For an L task that's self-contained (scaffold, a big generated config), delegate it to a subagent with a precise brief (task text, relevant ACs, standards, files to create, commands to run, "report files changed + check results, under 200 words"): `tdd-guide` when test-first. Otherwise do the work in the main session — there's no project-level implementation agent, and global agents are off-limits. Review its result (`git diff --stat`, run the checks) before ticking.

Announce the batch in one or two lines (`This run: T1–T4. Stopping before T5 (new group) — T6 needs you.`) and start; don't wait for approval unless something in the plan is a judgment call the user should make.

### Step 6: Per Task

1. **Mark started.** `[ ]` → `[~]` in `tasks.md`. On the spec's very first task, also update the status in these places:
   - set `spec.md` `> Status: in-progress`;
   - set this spec's Status cell in `epic.md`'s Specs table to `in-progress`;
   - if the epic header itself still says `> Status: planning`, set it to `in-progress` too. The first spec starting means the epic is being built, and `/project-status` reads that line.

   `specs.index.yml` is generated, so don't hand-edit it; mention `/refresh-indexes` in the report.
2. **Tests first (tdd only).** Invoke the `testing` skill with explicit args: `Generate failing tests for <T-id> covering <AC list> — mode 1 (Generate), then run them to confirm they fail`. It may still ask to confirm the file plan; answer from the spec where you can, otherwise relay to the user.
3. **Implement.** The smallest change that completes this task's text and its ACs — no work belonging to later tasks, nothing listed under Out of Scope. Follow the loaded standards and the repo's existing patterns.
   - **Stay inside `> Covers:`.** If the task genuinely needs a file outside the spec's covers (e.g. another spec's module), note it in the report rather than quietly spreading the change — ownership drift is how two specs end up claiming the same route.
   - Design work: match the cited `stride-design/` file's tokens, spacing and states; use existing tokens, not hard-coded values.
   - New dependencies: pin exact versions where the spec says so; don't add libraries the spec/tech-stack doesn't call for without asking.
   - Scaffolding generators (`create-next-app` and the like) refuse to run in a non-empty repo root, and this repo already has `softwareos/`, `.claude/`, `CLAUDE.md` and so on. Generate into a temp directory with the spec's flags, then copy the generated files in. Never overwrite existing project files: merge `.gitignore` instead of replacing it, and skip a generated README if one exists. Then delete the temp directory.
   - Secrets: placeholders only (`YOUR_SECRET_HERE` style) in `.env.example`; never write real credentials.
4. **Verify.** Run `/verify` (build → lint → typecheck → tests, auto-detected). Before tooling exists (early scaffold tasks), run whatever the task itself makes available. For TDD tasks, the task's tests must now pass. **Failing-first exception:** when the task is explicitly to write failing tests (e.g. "add failing … tests"), the new tests are RED by design — confirm each fails for the intended reason (missing/buggy implementation, not broken setup, bad imports or syntax errors), and require the rest of the suite to stay green. That confirmed RED is the evidence to tick it; it is not a halt condition.
   - Build/type errors you can't fix in one straightforward attempt → delegate to `build-error-resolver`.
   - Still red after two fix attempts → stop the run (Step 7). This doesn't apply to the intended RED of a failing-first task.
5. **Tick and commit.** `[~]` → `[x]`, then stage only this task's files plus `tasks.md` (and status edits) and commit:

   ```
   feat(<epic-slug>): <what this task did, imperative, ≤ 72 chars>

   T<n>: <task text, shortened>
   Covers: AC<x>, AC<y>          # omit if the task maps to no AC

   Co-Authored-By: <per the session's attribution instructions>
   ```

   Use `chore(<epic-slug>):` for pure tooling/config tasks and `test(<epic-slug>):` for test-only tasks. If a pre-commit hook fails, fix the cause — never `--no-verify`.

### Step 7: Halt Conditions

Stop the run (finish or roll back the current task first) and report. Never work around these:

**Human-only task** — needs an account, a dashboard or integration click-through, real secrets, payment, a DNS change, or watching a real deploy/preview. Examples: linking a Vercel project, connecting Neon, setting env vars in a hosting dashboard, confirming a preview deploy. Leave it `[ ]` and print:

```
T<n> needs you: <one-line why>

Steps:
1. <exact, clickable-level step>
2. …

When done, tell me: <what to report back — e.g. "the Vercel project name and that DATABASE_URL/DIRECT_URL are set">.
```

Then check whether later open tasks depend on it (shared files, "after T6", spikes). If some don't, AskUserQuestion: wait, or continue with `<independent task IDs>` now. Prepare what you safely can in-repo (config files, workflow YAML) as part of tasks that own them — not by ticking the human task.

**Spec ambiguity or contradiction** — the task and an AC disagree, the spec contradicts a standard or another spec, a referenced design doesn't exist ("Flag to design"), or the task can't be done as written. Leave the task `[ ]` (or `[~]` if partially done, with work stashed or committed only if it's coherent) and report the exact conflict with `path:line` quotes on both sides, then recommend `/spec-changes` (or design follow-up). Don't pick an interpretation yourself — that decision belongs to whoever owns the spec.

**Optional task** — `(optional)` prefix: ask whether to do it or mark it `[-]` with `(cancelled — skipped, optional)`.

**Verify still red** — after two fix attempts (including `build-error-resolver`). Leave the task `[~]`, don't commit broken code (stash or keep uncommitted, and say which), and report failures as `file:line` with the error. In `setup` mode, the user may explicitly waive and accept a commit; record the waiver in the commit body.

### Step 8: Report

Keep it short:

```
implement-next-task — <epic>/<spec> (mode: <setup|production>, tests: <tdd|after|none>)

Done this run:
  T1 ✓ <summary> — <short sha>
  T2 ✓ …
Stopped: <reason — budget / new group / T6 needs you / ambiguity / red verify>
Progress: <done>/<total non-cancelled> tasks
Next: <next task + whether it needs the user>
```

Add when relevant:
- `Spec status → in-progress — run /refresh-indexes to update specs.index.yml.`
- Files touched outside `> Covers:`.
- When only Verification tasks remain: suggest `testing` (run) → `qa` → `pr`.

## Tips

- **Re-invoke to continue.** Each run is cheap to start because `tasks.md` holds the state; prefer two clean runs over one bloated one.
- **`[~]` left over from a previous run?** Resume that task first: check `git status`/`git diff` for partial work, finish it, verify, then tick.
- **Sub-tasks** (`T6.1`, `T6.2`) follow their parent in order; a human-only parent usually makes its sub-tasks human-only too — check each.
- **Cancelled `[-]` tasks** are skipped and never reopened here; that's a `/spec-changes` decision.
