# Task 1 — foundational assessment domain

Completed in the isolated `codex/consulting-assessment` worktree. Scope is `src/modules/assessment/` plus this report. Existing delivery-workbench, demo, routes, packages and storage are unchanged by this task.

## Interfaces

- `types.ts`: Zod schemas and inferred domain types for workspace version 2, engagement, opportunity, all option/evidence/assumption/process/validation records, scenarios, simulation summaries and recommendation snapshots. `workspaceSchema` checks globally unique active entity IDs, selected option membership, exactly one BAU, and assumption option/evidence references. Historical snapshot IDs intentionally retain their original identity and do not collide with active IDs. Draft ISO dates allow `""`; unknown numeric inputs remain `null`.
- `model.ts`: `createWorkspace()`, `createEngagement(name?, currency?)`, `createOpportunity(name?)`, `createOption(kind)`, `duplicateEngagement(engagement)`, `reviseEngagement(engagement, detail, mutate)`, `recordRecommendation(engagement, opportunityId, input)`, `isRecommendationStale(opportunity, recommendation)`, `newId()`. All updating operations return clones. Recommendation input contains outcome, rationale, conditions, alternativesRejected, nextDecisionDate and strategicException (a narrative string).
- `economics.ts`: `calculateOption(option, bau, scenario?)`, `sensitivityOption(option, bau)`, `simulateOption(option, bau, seed, ranges?)`. Exports `FinancialResult`, `MonthlyFlow`, `TriangularRange`, `SimulationRanges`. Calculation returns complete/incomplete/overlap and actionable issues; incomplete and overlap expose null financial metrics. Sensitivity and simulation reject invalid models with actionable errors.
- `assessment.ts`: `assessOpportunity(engagement, opportunity)` and `materialFields(option)`. Field paths are labour input names, `costs.<id>.amount`, `costs.<id>.startMonth`, `costs.<id>.endMonth`, `benefits.<id>.annualAmount`, and `benefits.<id>.cashShare`. Latest version/timestamp provenance must match the current number. Additional assumptions marked material also participate.
- `templates.ts`: `createTemplate('support' | 'reporting')`. Both produce one opportunity with four independent, baseline-consistent, costed options; explicitly synthetic evidence, an unresolved conflict, editable dates, validation handover and discovery notes. Neither claims measured model calls. Support documents a contractor-renewal cash mechanism; reporting cash shares remain zero.

Readiness fields `feasibility`, `adoption`, and `risk` live directly on Opportunity and use unknown/ready/concern. Their defaults are unknown. `criticalControlsOpen`, `economicHurdle` (default 0), and `budgetCeiling` also live on Opportunity. Narrative fields, including objectives, constraints and validation hypotheses, are strings. Discovery categories each contain `{ notes: string }`. SolutionOption additionally contains `cashMechanism` and `reviewAllocation` strings. Workspace brand defaults to Beck.

Simulation requires caller-supplied `ranges.inputRevision`; omitted revision is rejected. The optional adoption/reduction/costMultiplier ranges use min/mode/max; unspecified bounds resolve to documented defaults and the actual bounds are included in the persisted summary. A summary contains 10,000-draw percentiles, 20-bin histogram, economic-payback probability, seed, model version `assessment-v2.1`, inputRevision, ranges and the independence explanation. Run the pure function in a worker in the UI task: a 10,000-draw run takes approximately 2.5–3.5 seconds in this environment. There are no retained raw draws or network calls.

## Financial and revision conventions

The model uses Decimal.js and 37 flow rows: month 0 followed by months 1–36. Row fields are named properties, not positional tuples. Costs are scheduled inclusively from startMonth through endMonth; one-time costs occur at startMonth; annual costs recur at startMonth + 12n. BAU costs and benefits are subtracted at matching months. Annual-equivalent discounting uses `(1 + annualRate)^(month/12)`. Ramp reaches full benefit at rampMonths, with no benefit at month 0. Scenario calculations do not mutate saved options.

Capacity value includes the cash subset, which is never added again. Enabled quality/revenue benefits scale with adoption and ramp. Revenue documentation must identify contribution margin. Cost/benefit unknowns block completion; baseline annualVolume, minutesBefore, hourlyCost, productiveHours and discountRate must match BAU. BAU reduction is zero relative to current workload.

Review time is deducted before valuing released hours. Review costs together with review time require documented separate allocation. Per the corrected brief, review time greater than gross savings returns incomplete with an instruction to cost and allocate the extra effort. Sensitivity and simulation ranges entering that invalid region are also rejected.

Investment is net incremental cost at month 0. First-year ROI is net months 0–12 divided by this investment, and is null if the denominator is nonpositive. Annual OPEX is recurring incremental cost in months 1–12. Payback uses the first month-end with nonnegative cumulative value that remains nonnegative through month 36; a later scheduled investment can undo early payback. Unachieved payback is null. Maximum viable investment is discounted future net excluding month 0. Break-even adoption is the bounded 0–1 threshold for zero NPV, and is null when unreachable; opportunity-specific hurdles are evaluated separately by policy.

Opportunity source revisions change for opportunity inputs/evidence/readiness and engagement brief changes. Saving only a simulation or recommendation does not change source revision. Engagement revision still advances for those saves. Recommendations project and clone the complete opportunity without recursive recommendations and the engagement summary without live opportunities/history. Subsequent edits never rewrite those snapshots. Duplication assigns fresh active IDs, remaps dependent references and cost/benefit provenance paths, clears recommendation/simulation/history artifacts, and preserves legacy snapshots and narrative strings verbatim.

## Policy corrections incorporated

The original task brief allowed explicitly owned assumptions to confer investment readiness. The controller corrected this against the approved user specification: owned assumptions remain valid saved/calculated inputs, but **accepted supporting evidence is required for each material field before investment readiness**. Missing/conflicted/rejected material support yields Investigate and blocks recording an investment recommendation. Merely changing an evidence review does not rewrite numeric inputs.

Risk must be explicitly assessed; absence of an identified critical control failure does not imply ready. Unknown readiness yields Investigate; noncritical readiness concerns yield Validate through pilot. Open critical controls or an exceeded initial investment budget yield Defer. A complete supported case below the NPV hurdle yields Reject. Recording investment against that adverse economic conclusion requires a nonempty strategic-exception rationale, retains the Reject assessment and explicit exception flag, and preserves computed economics. Strategic exceptions cannot bypass missing evidence, incomplete economics, critical controls, budget limits or readiness concerns.

## Verification

All commands ran from the isolated worktree using its dependency junction.

- Red: initial module test runs failed because implementations were absent. Later behavioral red runs demonstrated narrative/legacy ID rewriting, omitted simulation ranges, instant simulation staleness, silently clamped excess review, untracked cost timing provenance, all-assumed investment readiness and unassessed risk readiness. Each was followed by the focused passing run.
- `node node_modules/vitest/vitest.mjs run src/modules/assessment` — **22 tests, 3 files passed**. Coverage includes null drafts, schema IDs/references, independent options, duplication/reference preservation, snapshots/staleness, cash subset, recurrence and BAU offsets, ROI denominator, no payback, baseline mismatch, missing cash mechanism, overlap, margin/review requirements, scenarios/discounting, deterministic 10,000-draw simulation, provenance/conflict/critical/strategic-exception gates and both synthetic templates.
- `node node_modules/vitest/vitest.mjs run` — **258 tests, 78 files passed**, 13.66 seconds. Existing baseline was 236 tests; 22 domain tests were added.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false` — **passed**.
- `node node_modules/eslint/bin/eslint.js src/modules/assessment --max-warnings=0` — **passed**.
- `node node_modules/prettier/bin/prettier.cjs --check src/modules/assessment` — **passed**.

Formatting writes needed sandbox escalation because the authorized managed worktree is outside the original writable checkout. No production or dependency changes were made outside the scoped worktree.

## Handoff and limits

No foundational item is intentionally left unimplemented. Routes, storage transactions, worker wiring, imports, exports, browser validation and deployment remain subsequent tasks. This task did not run a build or browser suite because it changes only pure domain modules; the full release verification remains the controller's responsibility.

Accepted evidence, cash mechanisms, margin descriptions and non-overlapping allocations are practitioner assertions, not machine-verifiable truth. In particular, overlap resolution requires both the explicit flag and a recorded mechanism; the UI must make the allocation edits and explain that this certifies edited non-overlapping amounts, rather than present it as a generic warning-dismissal button. Human practitioner validation remains external. Synthetic examples intentionally remain Investigate until their evidence is replaced or properly resolved.

## Review fix round 1

Fixed both Important findings against commit `f961e62` without changing schemas or unrelated files.

- Negative NPV is independently adverse even when a caller configures a lower negative economic hurdle. The value dimension remains concern and an otherwise complete supported case remains Reject. Recording investment requires a documented strategic exception and preserves the adverse assessment and calculated value. The regression uses an actual NPV of **−820,000** (three years of 60,000 annual benefit less a 1,000,000 initial investment), with a configured hurdle of −1,000,000. An empty exception is rejected; a documented exception retains the original −820,000 NPV. Exception messages now describe the adverse economic assessment, including negative value, rather than incorrectly claiming the configured hurdle was necessarily missed.
- A valid BAU self-comparison scenario returns the same zero incremental result as its base comparison. Scenario perturbations are not independently applied to one side of the same baseline. Original option validation and scenario-schema validation still run first, so missing baseline inputs or malformed scenarios do not become misleading completed zero results. BAU sensitivity and simulation are explicitly unsupported and throw a message instructing the caller to select an alternative. Non-BAU scenario, sensitivity and simulation behavior is unchanged.

Four regression tests cover genuine negative NPV, the support example's saved BAU scenario, BAU sensitivity, and BAU simulation. Red runs reproduced value incorrectly marked ready, BAU scenario NPV of −6,237.29, and unsupported sensitivity/simulation returning results. The simulation test was run separately before the fix to verify its own failure.

Exact focused green command:

```text
node node_modules/vitest/vitest.mjs run src/modules/assessment/assessment.test.ts src/modules/assessment/economics.test.ts
```

Output:

```text
 RUN  v4.1.11 C:/Users/behzo/.codex/worktrees/consulting-assessment/AI Transformation Platform

 Test Files  2 passed (2)
      Tests  20 passed (20)
   Start at  19:03:06
   Duration  6.55s (transform 198ms, setup 266ms, import 262ms, tests 5.72s, environment 1.15s)
```

After formatting, `node node_modules/vitest/vitest.mjs run src/modules/assessment` passed all **26 tests across 3 files** (8.50 seconds). `node node_modules/typescript/bin/tsc --noEmit --incremental false`, `node node_modules/eslint/bin/eslint.js src/modules/assessment --max-warnings=0`, and `git diff --check` also passed. No full application or browser rerun was needed for this focused domain correction.
