# Consulting assessment release acceptance

This is a release checklist, not a claim that checks have passed. Populate evidence as implementation proceeds. The existing public demo must remain usable throughout development.

Foundation checkpoint: commits `f961e62` and `cf94c8d` passed 26 focused domain tests and independent review. These cover financial timing, cash/capacity separation, nulls, overlap gates, negative economics, simulation reproducibility and immutable snapshots. The end-to-end gates below remain pending until storage, UI and exports consume those services and their integration tests pass. Exact evidence is in `assessment-task-1-report.md`.

Resolved hardening defect (controller diagnostic, 2026-09-24; Task3B review complete, 2026-10-01): finite `1e200` inputs originally produced completed Infinity metrics and a simulation histogram failure. Checked Decimal conversions now return actionable incomplete results or safe sensitivity/simulation errors, without clamping or changing normal seeded v2.1 sampling. Regression evidence and independent review are recorded in `assessment-task-3b-report.md`. No Infinity/NaN may be presented or exported as a completed assessment; Task4 must preserve this boundary.

## Reviewed implementation checkpoints

Tasks1,2,3A,3B and4 have passed independent scoped review, including the correction rounds. Their reports contain exact commands, outputs and native-browser evidence. Whole-branch review identified four corrections, committed at `6f1083f`; the one scoped final re-review confirmed all four addressed and no new breakage. The table below distinguishes automated engineering coverage from release/deployment and external human validation.

## Functional gates

| Gate                 | Required observation                                                            | Verification owner               | Status   |
| -------------------- | ------------------------------------------------------------------------------- | -------------------------------- | -------- |
| Blank engagement     | No inherited client facts; create, save and reload                              | UI/browser tests                 | Covered  |
| Engagement lifecycle | Duplicate, rename, archive, restore; original unchanged                         | Domain + browser                 | Covered  |
| Independent options  | Switching alternatives retains each saved input and cost schedule               | Domain + browser                 | Covered  |
| Currency             | USD/GBP/EUR labels consistent; changes never imply FX conversion                | UI + exports                     | Covered  |
| Evidence review      | Missing, conflict, accepted and rejected distinguishable; rationale retained    | Domain + browser                 | Covered  |
| Baseline import      | CSV and XLSX mapping, period, units, preview, exact source location             | Import + browser                 | Covered  |
| Traceability         | Review does not silently overwrite assumptions; links and versions inspectable  | UI + browser                     | Covered  |
| Missing values       | Unknown differs from zero in screens, policy and exports                        | Domain + UI + exports            | Covered  |
| Cost schedule        | Month 0 and months 1–36, recurrence and BAU offsets verified                    | Economics tests                  | Covered  |
| Benefit separation   | Cash subset never added to capacity a second time                               | Economics tests                  | Covered  |
| Overlap              | Shared work/cost pools cannot aggregate without documented allocation           | Economics + UI                   | Covered  |
| Financial edge cases | Zero investment, negative value, unachieved payback, excess review effort       | Economics tests                  | Covered  |
| Scenarios            | Conservative/base/upside/custom preserve the underlying option                  | Economics + browser              | Covered  |
| Simulation           | Reproducible 10,000 draws; ranges, seed, revision, model version saved          | Economics + worker/browser       | Covered  |
| Recommendation       | Inspectable gates; strategic exceptions preserve adverse economics              | Policy + browser                 | Covered  |
| Snapshot             | Later evidence/input changes flag review without rewriting old content          | Domain + browser                 | Covered  |
| Validation           | Hypotheses, thresholds, method, owner, budget, controls and stop criteria       | UI + exports                     | Covered  |
| Transaction          | Save notification follows committed storage transaction                         | Repository + browser             | Covered  |
| Multiple tabs        | Stale write rejected; explicit reload preserves newer record                    | Repository + browser             | Covered  |
| Recovery             | Invalid backup, cancelled restore, blocked/corrupt storage do not erase records | Repository + browser             | Covered  |
| Legacy migration     | Original browser record retained; decisions and unmapped data recoverable       | Migration + browser              | Covered  |
| Export consistency   | MD, PPTX and XLSX all use one selected draft or reviewed snapshot               | Export tests                     | Covered  |
| Export privacy       | Internal notes excluded by default, including nested/hidden content             | Export tests                     | Covered  |
| PPTX                 | Eight editable slides; long content handled; synthetic/date/currency/version    | Export tests + visual inspection | Covered* |
| Workbook             | Numerical parity, readable tables, no independent calculation engine            | ExcelJS round-trip               | Covered  |
| No transmission      | Entered content stays in browser; no provider requests                          | Browser request inspection       | Covered  |
| Responsive           | Both examples and blank journey at 1440, 1024 and 390 pixels                    | Browser + visual inspection      | Covered  |
| Accessibility        | Keyboard, focus, dialogs, tables, zoom, contrast and chart alternatives         | Browser + manual inspection      | Covered* |
| Existing demo        | Old two-project journeys, saved data, navigation and exports preserved          | Legacy test suite                | Covered  |
| Release              | Format, lint, types, tests, secret scan, build, deployed smoke check            | Final verification               | Pending  |

Controller full release verification at `f7a5f02` (2026-10-01): exact `corepack pnpm verify` passed global formatting, lint, strict types, 330 unit tests /92 files, secret scan, default Turbopack production build and81 browser journeys at1440/1024/390. Dependencies were installed offline from the frozen lockfile (921 reused, zero downloaded), with no package or Node changes. Earlier report-specific webpack/junction caveats are resolved for this run. Whole-branch review and deployment are still pending; any final fixes require fresh covering checks.

`Covered` records current automated engineering evidence, not practitioner usefulness. `Covered*` additionally has archive/visual or keyboard/Axe evidence, but does not claim native PowerPoint/Excel certification, a complete manual screen-reader audit or full WCAG conformance. No external practitioner sessions were conducted.

Final correction verification at `6f1083f` (2026-10-01): exact `corepack pnpm verify` exited0 after final source/test edits, with global format/lint/types,342 unit tests /92 files, secret scan, default production build and84 browser journeys at1440/1024/390 all passing. Retained regressions cover snapshot-local integrity, rejected restore preserving healthy data/revision/history, continuation-row budget formatting and allowlisted artifact branding. The earlier browser test fixture failure and corrective rerun are transparently recorded in `assessment-final-fix-report.md`. Final scoped review is clean; integration and deployed smoke checks remain pending.

Controller integration verification (2026-10-01): the squash-integrated original main tree passed exact `corepack pnpm verify`, exit0,342 unit tests /92 files and84 browser tests in2.8minutes, plus every format/lint/types/secret/build gate. The prior interrupted run and its two desktop timeouts are recorded in the implementation ledger; no code or timeout change was needed for the complete fresh pass. The runtime/test tree matches the reviewed feature branch. Only verification documentation follows this pass. Deployed smoke verification remains pending until the new Vercel release is ready.

## Independent arithmetic reference case

Use a small case with no discount or ramp to make a manual comparison possible. Annual volume 12,000; handling time 10 minutes; reduction 50%; human review 1 minute; adoption 75%; hourly cost 60; realisation 80%; cash share 25%; productive hours 1,600. One-time investment 10,000 at month 0 and recurring OPEX 100 in months 1–36. BAU has no incremental costs or benefits. No other benefits.

- Released annual hours: `12,000 × (10 × 0.5 − 1) ÷ 60 × 0.75 = 600`.
- FTE-equivalent capacity: `600 ÷ 1,600 = 0.375`.
- Realisable annual labour value: `600 × 60 × 0.8 = 28,800`.
- Cash subset: `28,800 × 0.25 = 7,200`, included within—not added to—28,800.
- First-year economic net: `28,800 − 1,200 − 10,000 = 17,600`.
- First-year cash net: `7,200 − 1,200 − 10,000 = −4,000`.
- ROI against initial investment: economic 176%; cash −40%.
- Undiscounted 36-month net: economic 72,800; cash 8,000.
- Month-end payback: economic month 5; cash month 20. If interpolation is used, the convention must be explicit and the test adjusted rather than mixing conventions.

These values verify the arithmetic convention only; they are not an estimate for a real client.

Controller verification, 2026-09-24: executed the current TypeScript engine through an in-memory TypeScript/CommonJS loader and Node strict assertions against the reference values above. All 13 checks passed (completion status, hours, FTE, capacity value, cash savings, both first-year net values, both ROI values, both NPVs and both payback periods). This was a read-only independent arithmetic check, not a substitute for automated release or browser tests. The separate extreme-input overflow finding was subsequently fixed and independently reviewed in Task3B, as recorded above.

## Practitioner validation remains external

Three to five consulting/transformation practitioners should compare the prepared synthetic assessment against their current spreadsheet/document workflow. Record completion time, errors, misunderstood assumptions, manual rework and export clarity. No engineering check proves the product saves practitioners time. Do not mark this validation complete without actual sessions and evidence.
