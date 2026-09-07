# Task 4 — Self-contained Sia Partners Synthetic Replay

## Summary

Replaced the `/demo` dashboard journey with a local-only, versioned Synthetic Replay workbench. It is explicitly non-production and uses browser-local persistence only. No provider, API, database, or credentialed runtime participates in the replay.

## Three cases

1. **Support Triage** is the four-minute hero: accepted evidence → assumption/economics revision → stored 10,000-sample simulation → Synthetic Committee Replay partial failure/retry → CFO objection action → append-only Beck decision.
2. **Executive Reporting** is a self-contained evidence-led reporting case with its own assumptions and economics.
3. **Procurement Analysis** is a self-contained analyst-governed review case with its own assumptions and economics.

There are exactly three seeded cases in `DemoWorkspaceStore`; the prior broad Aster portfolio is not part of the `/demo` journey.

## Storage architecture

`DemoWorkspaceStore` uses a versioned key, `sia-synthetic-replay:<organisationId>`, so demo organisations cannot read each other’s state. The server render receives only a client workbench boundary; `localStorage` is accessed only in that client boundary. State is parsed defensively, resets to a stable seed for malformed or obsolete records, persists every mutation, and observes cross-tab `storage` events. It carries append-only activity and decision events, derived My Work, and local export entries.

Simulations retain a seed, summaries, confidence interval, payback probability, and eight histogram buckets, never raw samples. Economics call the existing deterministic `FinancialEngine`; simulations call the existing deterministic `SimulationEngine` with 10,000 samples.

## Visual rationale

The workbench retains the warm editorial evidence-desk language: modest bordered surfaces, ledger rows, small condition badges, a compact lifecycle rail, and readable audit detail. The guided path is intentionally subtle rather than a marketing hero, while keeping the core flow workable at desktop, tablet, and narrow mobile widths.

## Docs and implementations read

- Binding Task 4 brief.
- Next 16 local guidance: server/client component composition, `use client`, and linking/navigation.
- Existing `WorkspaceContext`, `/demo` page, financial engine, simulation engine, UI primitives, and existing demo dataset/workspace tests.

## Files

- `src/modules/demo-workspace/demo-workspace-store.ts`
- `src/modules/demo-workspace/demo-workspace-store.test.ts`
- `src/modules/demo-workspace/synthetic-replay-workbench.tsx`
- `src/modules/demo-workspace/synthetic-replay-workbench.test.tsx`
- `src/app/demo/page.tsx`

## RED / GREEN evidence

- Store contract was first run RED because `demo-workspace-store` did not exist. It then passed GREEN with six cases covering three-case seeding, isolation, reload, malformed recovery, migration/reset, deterministic recalculation/simulation, committee failure/retry/citations, objections, decisions, and queues.
- Hero workbench test was first run RED because the workbench component did not exist. It then passed GREEN, driving Support Triage through economics, simulation, committee failure/retry, CFO evidence request, and a persisted Beck decision.

## Verification

- Focused tests: 3 files / 10 tests passed.
- Full unit suite: 71 files / 178 tests passed.
- Lint, typecheck, Prettier formatting, `git diff --check`, production build, and secret scan passed.
- Static demo scan found no Gmail, Calendar, OAuth, Supabase, OpenAI, Inngest, API-key, or `fetch` reference in `src/app/demo` or `src/modules/demo-workspace`.
- Visible controls in the workbench either mutate `DemoWorkspaceStore` or select the locally rendered case; none is provider-dependent.

## Screenshots

Not captured. The installed browser QA skill is not built in this worktree and requires a one-time setup confirmation. The temporary local Next server was stopped. No credentials or provider connection was attempted.

## Limitations

- Replay timestamps are deliberately stable seed timestamps to keep reset and test results deterministic.
- The local decision export is an auditable demo-state entry, not a downloadable production artifact.

## Commit

`feat: add local synthetic replay workbench` (the worktree commit containing this report).

## Review fix round 1

Addressed all five review blockers without widening the local-only demo boundary.

- Added a validated editable custom adoption/benefit scenario that stores the same deterministic 10,000-sample summary, seed, interval, probability, and histogram as conservative/base/upside. The workbench renders the custom result in a scenario comparison.
- Added immutable assumption revision snapshots with old/new values, provenance, confidence, evidence ID, owner, stable timestamp, and version. Current assumptions are replaced from the recorded latest revision and the history is visible.
- Reworked CFO objections into append-only actions with actor, rationale, time, and linked assumption revision. Status is derived from the latest action and the action trail is visible.
- Added citation validation against accepted evidence. Rejected (`ev-4`) or missing citations create failed specialist events with `invalidCitations`; an invalid retry remains failed and only valid fixtures complete.
- Reset now replaces state with the exact stable seed, with no additional reset activity mutation. Added storage listener `dispose()` cleanup for client unmounts.

### TDD evidence

- **RED:** `.\\node_modules\\.bin\\vitest.CMD run src/modules/demo-workspace/demo-workspace-store.test.ts` — 5 expected failures: seed-exact reset, custom validation, assumption snapshots, citation validation, and objection audit status.
- **RED:** `.\\node_modules\\.bin\\vitest.CMD run src/modules/demo-workspace/synthetic-replay-workbench.test.tsx` — expected missing `Custom adoption` input.
- **GREEN:** `.\\node_modules\\.bin\\vitest.CMD run src/modules/demo-workspace/demo-workspace-store.test.ts src/modules/demo-workspace/synthetic-replay-workbench.test.tsx` — 10 tests passed.
- **GREEN:** `.\\node_modules\\.bin\\tsc.CMD --noEmit` — passed.
- **Verification:** full unit suite passed (71 files / 181 tests); lint, formatting, typecheck, production build, `git diff --check`, secret scan, and scoped provider/network scan passed.
