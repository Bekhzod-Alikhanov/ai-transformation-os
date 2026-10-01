# Task 3B — investment and recommendation journey

Status: DONE (2026-10-01), within the assigned Task 3B boundary. Task 4 deliverable integration remains explicitly assigned to the next slice.

Implementation base: `461d52c`, isolated `codex/consulting-assessment` worktree. No push, deployment, dependency changes, provider calls, schema rewrite or subagents. Controller-owned `docs/assessment-implementation.md` is excluded.

## Implemented

Four operational navigation surfaces: Brief, Evidence, Options & Value, Recommendation. The work queue now opens Recommendation for stale recommendations. Task 4 owns the fifth surface and actual exports; no inactive download controls were added.

Options use independent retained drafts and explicit transactional saves. Shared baseline changes apply consistently to all four alternatives with assumption revisions. Percent inputs convert to fractions; blanks stay unknown. Explicit owner, confidence and real evidence selection are required for provenance. Retained base drafts capture their original financial basis and reject a save if another saved edit has changed that basis. This prevents switching options and accidentally restoring an obsolete shared baseline. Scenario/simulation saves cannot be overwritten by an older base form.

Cost editing covers category, name, amount, frequency, start/end months and accounting. Benefit editing covers enabled quality/contribution-margin potential, amount, pool, cash subset, mechanism and overlap allocation. Existing engine review-allocation and pool-overlap checks remain authoritative. Deleted cost fields and disabled benefit fields receive append-only `material: false` provenance revisions, preventing obsolete fields from leaving unresolvable readiness blockers. Re-enabling a benefit produces current material provenance again; history is retained.

Provenance editor and inspector expose current source version/review status, ownership, confidence and complete per-field revision history. Evidence blockers navigate to the actual source when linked; unsupported assumptions navigate to their option and open the matching provenance field. Readiness controls distinguish unknown, ready and adverse/concern across five dimensions, with explicit risk readiness separate from critical-control findings.

Financial results and all-option comparisons use the reviewed economics engine. Recharts shows monthly cumulative economic/cash net curves with accessible data tables. Monetary results identify currency and incremental BAU comparison. Annual hours/benefits are steady-state at entered adoption, first-year totals include ramp, ROI uses month-zero incremental investment, and cash is a subset. Completed null payback means not reached within 36 months; incomplete means not assessed. Zero-NPV adoption is distinguished from the configured hurdle and unattainable 0–100% adoption. Negative maximum viable investment is explained as no viable nonnegative initial investment.

Saved base, conservative, upside and custom per-option scenario comparisons are explicitly what-if analysis; they never overwrite the recommendation basis. Custom patches cover all labour inputs plus cost and benefit multipliers; blank override means inherit. Shared baseline mismatches remain actionable engine errors. Base sensitivity and break-even use engine services. BAU self-comparison stays zero incremental and hides unsupported sensitivity/simulation actions.

Simulation runs 10,000 draws in a dedicated local WebWorker with adjustable seed and triangular ranges. It terminates on cancel/unmount/option change; failed runs show actionable errors without saving. Completed results require explicit save, capture the originating option ID and revision, and reject persistence against changed opportunity context. Seed/ranges/model version/revision/percentiles/histogram/payback probability persist through the schema. Stored summaries are visibly stale when the opportunity revision changes. The current contract has opportunity-level revisions, so this is intentionally conservative: evidence, scenario, selection or readiness changes can mark a summary stale even if its numerical inputs are unchanged. Copy says probabilities describe the specified assumptions, not the chance of project success or evidence truth; correlations are not modelled.

Recommendation composer uses `recordRecommendation` inside the awaited save mutator, copying only its generated immutable recommendations into the outer revision transaction. This avoids duplicating engagement history/revision increments. The composer identifies the saved selected option's base and source revision; temporary scenario results never become recorded economics. Investment gates are enforced by the domain service. Strategic exceptions preserve adverse computed results and cannot bypass hard evidence/readiness/control/budget gates. Snapshot history and inspector use snapshot-contained options, currency and validation, with current/stale markers. Validation handover persists all fields and original concise NIST-inspired prompts with advisory/not-certification language.

## Narrow economics hardening

The controller's schema-valid overflow reproduces with `annualVolume = hourlyCost = 1e200`: prior calculation returned complete/non-finite results. Checked Decimal-to-number conversions now guard money, capacity/FTE and ROI. The public deterministic boundary catches only the dedicated range error and returns incomplete/null metrics with actionable guidance; sensitivity and simulation throw the same safe error, which their UI/worker catches. No values are clamped or input records rewritten. Scenario multipliers, tiny positive denominators, samples and histogram boundaries are covered.

Model version remains `assessment-v2.1` deliberately. During implementation, Decimal sampling/histogram arithmetic was considered, then removed in self-review. Final triangular sampling, random sequence, histogram formulas and normal-range operation ordering are exactly the existing JavaScript arithmetic. Only finite-result guards were added. The version therefore identifies unchanged successful arithmetic; only previously unsafe outputs are refused. Existing saved records and summaries remain valid without migration or rewriting. Deterministic Decimal arithmetic/rounding is also unchanged apart from checked conversion.

## Exact interfaces

`ui/surface.ts` extends `Section` to `"brief" | "evidence" | "options" | "recommendation"`; `SurfaceProps`, `SaveEngagement`, inspector and draft APIs are unchanged. `Options` and `Recommendation` consume the same props as Brief/Evidence.

`ui/investment-operations.ts` exports:

```ts
type AssumptionMetadata = Pick<AssumptionRevision,
  "owner" | "confidence" | "evidenceIds">;
saveOption(opportunity, input: SolutionOption, metadata,
  expected?: SolutionOption): Opportunity;
saveProvenance(opportunity, optionId, field, metadata): Opportunity;
saveSimulation(opportunity, optionId, summary: SimulationSummary): Opportunity;
blockerTarget(opportunity, blocker): NavigationTarget;
```

All return cloned domain records; persistence remains the existing `save` callback. `saveOption` validates the option schema, enforces ownership/real evidence, guards retained drafts, propagates shared baseline fields, appends changed/retired provenance and preserves separately saved scenarios/simulation. `saveSimulation` checks the captured opportunity revision and summary schema. UI-generated field provenance is `assumed` and material unless the field was explicitly retired.

`ui/simulation.worker.ts` exports types only to the UI:

```ts
type SimulationRequest = {
  option: SolutionOption;
  bau: SolutionOption;
  seed: number;
  ranges: SimulationRanges;
};
type SimulationResponse =
  { ok: true; summary: SimulationSummary } | { ok: false; error: string };
```

Construction: `new Worker(new URL("./simulation.worker.ts", import.meta.url))`. PostMessage uses `structuredClone` input. No main-thread simulation fallback or provider call exists.

## Task 4 export integration

The exact typed boundary is exported from `src/modules/assessment/ui/surface.ts`:

```ts
type DeliverableSelection =
  | { kind: "snapshot"; snapshot: RecommendationSnapshot }
  | { kind: "draft"; engagement: Engagement; opportunity: Opportunity };
interface DeliverablesProps {
  selection: DeliverableSelection;
  brand: Workspace["brand"];
  includeInternalNotes: boolean;
}
```

In `workbench.tsx`, add `deliverables` to `Section`, append `["deliverables", "Deliverables"]` to the existing ordered navigation array, and add a render branch beside `Options`/`Recommendation`. The controller already holds `workspace.brand`, selected engagement/opportunity and optional `recordId`; Task 4 can use a snapshot selector there or within its own surface. Pass the exact snapshot object for historical previews. Calculate its economics from `snapshot.opportunity.selectedOptionId` against its snapshot BAU, using `snapshot.engagement.currency`. Do not pull current assumptions, validation, evidence or temporary scenarios into snapshot exports. Draft exports must explicitly identify the saved current base as an unreviewed draft, never the unsaved forms. Default `includeInternalNotes` to false. Preview and all three outputs must share the Task 4 payload. Brand is an explicit rendering input because existing recommendation snapshots do not capture workspace brand.

## RED / GREEN evidence

- `node node_modules/vitest/vitest.mjs run src/modules/assessment/economics-overflow.test.ts`: RED 3 failures: complete instead of incomplete for extreme products/scenario, and simulation histogram TypeError. GREEN with existing economics tests: 14/14 pass, including finite normal cases, safe sensitivity and simulation failures, tiny productive-hours denominator and unchanged inputs.
- `node node_modules/vitest/vitest.mjs run src/modules/assessment/ui/investment-operations.test.ts`: initial RED missing adapter module. Initial GREEN 3/3 for shared baseline/independent option provenance, owner/evidence validation and captured-option simulation save. Later RED 2 failures for retained draft overwrite and wrong blocker target; GREEN 5/5. Final self-review RED for unretired deleted cost (`material:true`, version 1); retirement/re-enablement GREEN in final focused 11/11 across operations, UI and metric files.
- `node node_modules/vitest/vitest.mjs run src/modules/assessment/ui/investment.test.tsx`: initial RED missing Options module. GREEN 3/3 for blank/draft switching, percent save/owner requirement, and saved-base immutable recommendations. One intermediate test locator matched both base/provenance ownership editors and was scoped to the base owner.
- `node node_modules/vitest/vitest.mjs run src/modules/assessment/ui/financial-results.test.tsx`: RED cash payback showed `Not assessed` for a completed non-paying case. GREEN 1/1 distinguishes completed not-reached from incomplete.
- First desktop browser check: worker cancellation/switch/repeat/staleness passed; template test hit a duplicated local/global error locator. Scoped to `#assessment-content`. Subsequent all-size exploratory run was interrupted after the wrapped textarea exact-label selector timed out; role locator fixed. Both template desktop journeys then passed in 11.8s, including full backup/restore.
- Stale queue navigation regression: `node node_modules/@playwright/test/cli.js test tests/e2e/assessment-investment.spec.ts --project=desktop --grep 'support saved' --timeout=20000` RED expected Recommendation, got Engagement brief. Corrected queue target; desktop/tablet full journeys passed afterward.
- `node node_modules/@playwright/test/cli.js test --timeout=45000`: 70 passed / 2 failed in 2.1m. Only failures were mobile Axe `scrollable-region-focusable` on the comparison table. New financial, monthly-data and sensitivity scroll containers now have labelled region semantics and keyboard focus.
- Visual-review tablet navigation regression: focused tablet support journey RED button height 59.375px versus usable single-line limit <43px. Narrow navigation padding/type/gap and nonshrinking section numerals fix wrapping while retaining warm Inter design.

- One final full unit run overlapped a production build and returned 310 passed / 1 timeout: the real 10,000-draw save-adapter test took 7.385s against Vitest's default 5s limit. The test now has a scoped 15s timeout; the assertions and real simulation are unchanged. A fresh suite run without a build follows below.

## Final verification

- `node node_modules/vitest/vitest.mjs run`: **312 passed / 88 files**, 14.53s, exit 0. Includes final ROI regression: RED returned `Not assessed` for complete BAU ROI, GREEN returns `Not defined (no positive initial investment)` and retains Not assessed for incomplete cases.
- `node node_modules/next/dist/bin/next build --webpack`: final production build **PASS**, compile 8.6s and TypeScript 8.5s, route `/workbench` and worker bundle generated.
- `node node_modules/@playwright/test/cli.js test tests/e2e/assessment-investment.spec.ts --grep 'saved option journey|accepted support' --timeout=45000 --output=test-results/assessment-final`: **9 passed**, 35.2s, across desktop/tablet/mobile. This replaces both mobile failures from the full 72-case run and confirms the queue/navigation corrections, accepted support gate, unchanged inputs, immutable snapshots, validation staleness, persisted scenarios and backup/restore. Axe and whole-page overflow assertions pass for both added surfaces and both templates at all three widths.
- Final mobile table readability refinement gives the comparison table a 620px minimum width inside its labelled keyboard-focusable scroll region, preserving complete monetary amounts. `node node_modules/@playwright/test/cli.js test tests/e2e/assessment-investment.spec.ts --project=mobile --grep 'saved option journey' --timeout=45000 --output=test-results/assessment-mobile-final`: **2 passed**, 10.3s, against the final build, including Axe and no whole-page horizontal overflow.
- The full browser run's other **70 passing** cases include all 15 legacy journeys and worker cancellation, switching, reproducibility and stale summaries at all three widths. A second broad rerun was not needed for the narrow accessibility/copy/layout corrections; the affected cases were rerun as above.
- Scoped ESLint across assessment UI, workbench, economics, overflow tests and new browser tests: exit 0. `node scripts/secret-scan.mjs`: `Secret scan passed.` Scoped Prettier over the same implementation/test files plus this report: `All matched files use Prettier code style!` `git diff --check`: exit 0 (only existing Git LF/CRLF normalization notices).

## Screenshot handoff

All paths are beneath `C:/Users/behzo/.codex/worktrees/consulting-assessment/AI Transformation Platform/`, uncommitted test artifacts. Both support/reporting templates have Options and Recommendation screenshots at every width. Representative final paths:

- `test-results/assessment-final/assessment-investment-supp-ab615--recommendations-and-backup-desktop/options-support-desktop.png`
- `test-results/assessment-final/assessment-investment-supp-ab615--recommendations-and-backup-tablet/recommendation-support-tablet.png`
- `test-results/assessment-mobile-final/assessment-investment-supp-ab615--recommendations-and-backup-mobile/options-support-mobile.png`
- `test-results/assessment-mobile-final/assessment-investment-supp-ab615--recommendations-and-backup-mobile/recommendation-support-mobile.png`

Inspected desktop Options, tablet Recommendation and mobile Options images. The tablet numeric prefixes and navigation labels now remain on one line; mobile forms stack and only the local comparison region scrolls. All values remain visible through its keyboard-accessible scroll. The screenshots after Axe may show the focused skip link, which is intentional keyboard behavior.

## Changed files

Economics boundary and regression: `economics.ts`, `economics-overflow.test.ts`. Controller navigation: `workbench.tsx`, `ui/surface.ts`, `ui/work-queue.tsx`. Small shared form rendering guard: `ui/fields.tsx` displays non-finite draft input as blank while the draft remains invalid and schema validation prevents its save. New focused UI: `options.tsx`, `option-editor.tsx`, `option-lines.tsx`, `provenance.tsx`, `financial-results.tsx`, `scenarios.tsx`, `simulation.tsx`, `simulation.worker.ts`, `readiness.tsx`, `recommendation.tsx`, `validation.tsx`, and `investment-operations.ts`. Focused tests: `investment-operations.test.ts`, `investment.test.tsx`, `financial-results.test.tsx`, and `tests/e2e/assessment-investment.spec.ts`. Styling: `ui/workbench.css`. This report. No other task-owned files are included in the commit.

## Self-review and constraints

The frontend-design skill guided continuation of the required warm Inter executive workspace: restrained panels, teal economic value, crimson adverse value, editorial metric hierarchy and mobile stacking. All added UI components remain under 300 formatted lines (no monolithic workbench). Next's installed `use-client.md` was read before client changes. TDD and verification skills governed the evidence above.

Self-review caught and corrected stale retained shared-baseline drafts, old material provenance after deleting/disabling lines, real-source blocker targets, payback/zero-NPV copy, the work-queue link, model-version arithmetic semantics, mobile keyboard scrolling and tablet navigation wrapping. Snapshot content is read-only and source-contained; save failure leaves drafts intact. Option switching cannot persist a simulation into another option. Typed Deliverables integration is deliberately incomplete until Task 4 supplies the actual surface/exporter.

Build uses `--webpack`, as instructed. The dependency junction remains untouched; no Turbopack root expansion, package upgrades or config changes. Default `pnpm verify` is not claimed: baseline checkout CRLF conversion still affects the global formatting command and default Turbopack cannot resolve the external junction. Scoped formatting/build/type/lint/unit/browser verification is recorded instead. No database suite is needed for these local-only changes. Browser subprocess output includes the existing NO_COLOR/FORCE_COLOR warning.

## Review round 1 — pending drafts, evidence targets and retired history

Review target: `3dcb9e8`; fix base: `68ed8b7` (controller documentation commit). Both important findings and the retired-provenance polish are addressed. Controller-owned ledger changes remain excluded.

The shared `useDraft(key, saved)` API is unchanged, but `reset()` now conditionally clears only the exact draft entry captured by that render. Every edit creates a unique entry token. An awaited save therefore cannot erase a newer edit, including after a form remount, an inspector snapshot callback, or an explicit clear followed by another edit. Explicit workspace-wide discard remains unconditional. Five real form regressions cover validation, readiness, recommendation, provenance and scenarios; a stale reset regression also covers clear/re-edit identity. Inputs remain usable during persistence and newer values remain visibly unsaved.

Simulation captures the reset callback with the inputs at **run start**, not at summary-save time. This preserves range/seed edits made during computation, after completion but before saving, and during persistence. A pending summary is cleared only if it is still the saved summary. This is internal UI state only: worker, storage, model-version and Task 4 export contracts are unchanged.

`blockerTarget` prioritizes an explicit source target, then a linked conflicted/rejected source, then other nonaccepted sources, before an accepted fallback. Regression fixtures place accepted evidence first and adverse evidence second. Retired field paths from assumption history are now selectable with a read-only label; editing controls are omitted while their complete revision/source history remains inspectable. Removed cost and disabled benefit cases are covered.

### Round 1 RED / GREEN evidence

- `node node_modules/vitest/vitest.mjs run src/modules/assessment/ui/pending-drafts.test.tsx src/modules/assessment/ui/investment-operations.test.ts`: RED **8 failed / 7 passed**. All five pending forms erased newer values; a stale range reset restored the old seed; both conflicted and rejected evidence routing opened the first accepted source.
- `node node_modules/vitest/vitest.mjs run src/modules/assessment/ui/provenance.test.tsx`: RED **1 failed**, retired field choice absent.
- `node node_modules/@playwright/test/cli.js test tests/e2e/assessment-investment.spec.ts --project=desktop --grep 'pending native saves' --timeout=60000 --output=test-results/assessment-review-red`: RED **1 failed**, expected newer seed 67 but received saved-run seed 23. The validation pending-save case already passed. This exposed the separate run-versus-save capture boundary and drove the simulation correction. An earlier attempt used the default 5-second result wait; the real worker's result wait is now scoped to 20 seconds.
- `node node_modules/vitest/vitest.mjs run src/modules/assessment/ui/pending-drafts.test.tsx src/modules/assessment/ui/provenance.test.tsx src/modules/assessment/ui/investment-operations.test.ts src/modules/assessment/ui/investment.test.tsx src/modules/assessment/ui/brief.test.tsx`: GREEN **21 passed / 5 files**, 6.29s. Existing unchanged-save behavior remains covered alongside deferred completion and remount cases.
- `node node_modules/next/dist/bin/next build --webpack`: GREEN production build, compile **7.8s**, TypeScript **8.7s**. One prior build caught an unsupported test-locator option, which was removed before this successful build; its immediately following browser attempt correctly could not start without a completed production build.
- `node node_modules/@playwright/test/cli.js test tests/e2e/assessment-investment.spec.ts --project=desktop --project=mobile --grep 'pending native saves|accepted support|removed cost provenance' --timeout=60000 --output=test-results/assessment-review-final`: GREEN **6 passed**, 25.2s, against that production build. The deferred-save fixture holds a real native IndexedDB transaction open with queued reads, then releases it; it does not fake successful persistence. Assertions verify committed older values and retained newer drafts. Both widths also verify adverse-source navigation and removed-cost history inspection.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: exit **0**. Scoped ESLint over the eight changed source/test files: exit **0** (a test-only `no-this-alias` issue was corrected). Scoped Prettier and `git diff --check` pass. No broad unit/browser replay was needed for this narrow review round.

Self-review: no schema or policy weakening, no persisted data rewriting, no loss of the original submitted save, and no export handoff changes. The existing browser NO_COLOR/FORCE_COLOR warning remains nonblocking and deferred. No dependencies, build configuration, junction targets, provider calls, pushes or deployments were changed.
