# Investment demonstrator — implementation ledger

Source of authority: Beck's approved Investment Decision & Delivery Demonstrator plan, 1 October 2026.

Baseline: `ffbc3f9`; clean checkout; 342 unit tests / 92 files pass.

## Work packages

1. Version 3 contracts, retained version 2 migration, task-derived financial model.
2. Computed option comparison, two verified synthetic examples, evaluation and validation services.
3. Unified populated cockpit, reactive modelling, discovery, workflow and evaluation surfaces.
4. Snapshot-consistent deliverables, regression journeys, accessibility and release verification.
5. Independent final review, squash integration, deployment and live acceptance.

## Pre-flight boundaries

- Tasks → financial engine → comparison → recommendation → exports share one canonical Decimal.js calculation authority.
- Snapshot schemas must contain task inputs, decision policy and evaluation facts, independently of live records.
- Demo and workbench use the same UI but different IndexedDB namespaces. No provider calls.
- Migration validates a copy; original browser records and legacy snapshots are retained.

## Rulings

- Isolation consent was requested asynchronously. Pending an answer, implementation uses a new `codex/investment-demonstrator` branch in the clean checkout; main remains unchanged. No new worktree is created without consent. This protects main's history but does not isolate working files.
- Existing aggregate cases remain aggregate; task modelling is opt-in. New templates use task modelling.

## Verification record

- Baseline unit suite: 342/342, 92/92 files, 19.73 seconds.
- Implementation and deployment remain in progress; this is not a completion claim.

## Connected release scope

| Requirement                                                         | Implementation / demonstrated evidence                                                                   | Verification status                                                                 |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Same populated public product and saved workbench, separate storage | Shared assessment shell; two demo records; blank workbench; scoped reset                                 | Browser namespace/reset and native v2 migration journeys                            |
| Reactive option and task economics                                  | Four independent options; shared task baseline; eight scheduled cost lines; draft cockpit challenge      | Reference arithmetic, negative/unknown task tests; browser edit/save/reload         |
| Inspectable advisory preference                                     | Economic/cash objective; NPV, budget, payback, evidence, suitability and control gates                   | Support base/adverse and Reporting non-AI tests                                     |
| Evidence and discovery                                              | Source review/imports/provenance; editable workshop questions; requests                                  | Import/review and sequential workshop-save regressions                              |
| Workflow and evaluation                                             | Node inspectors; fixed Support replay; executable reporting CSV; fixed recorded narration reconciliation | Computed row metrics, unsafe controls and dataset-specific gates                    |
| Validation, recommendation and exports                              | Generated editable handover; retained snapshots; one export payload for MD/PPTX/XLSX                     | Snapshot/content-canary/export tests and browser downloads                          |
| Responsive/accessibility/recovery                                   | Split inspector/drawer; tables; focus; no tour; transactional recovery                                   | Automated WCAG A/AA and browser journeys at 1440/1024/390                           |
| Deployment and Beck's presentation acceptance                       | Main → Vercel after all gates; production journeys after Ready                                           | Deployment result is verified separately after push; Beck's rehearsal not conducted |

## Independent review / one fix pass

Fresh whole-branch reviewer found four Important defects. Reproduced each RED→GREEN:

- Task deletion/reordering: stable shared baseline keys replace positional reassignment; surviving independent effort inputs and row identities are retained.
- Evaluation gate bypass: required dataset matching prevents a passing unrelated pipeline superseding unresolved Support findings; missing/empty required evaluations require validation.
- Workshop answer rollback: latest saved questions are the draft baseline; sequential saves retain the first answer on screen and in storage.
- Unknown global readiness: headline comparison now requires Investigate, consistent with the saved recommendation policy.

Reference-reduction export omission was regraded Important for calculation traceability; exported task rows/workbook now contain reference and selected reduction. Regression reproduced RED→GREEN. Final full-suite result is recorded below once complete. No second reviewer was dispatched.

Earlier browser runs surfaced obsolete navigation/fixture expectations, ambiguous labels and a cost-line-count expectation. Those were investigated and corrected; they are not counted as passing acceptance. The latest pre-review run had 84/87 passing, with three old cost-line-count failures subsequently corrected.

Ruling: reviewer declined to repeat browser/deployment checks — coordinator performs fresh release/live checks; costs if wrong are deployment regressions, not covered by source review.

Ruling: native Office rendering and full manual screen-reader validation remain unverified — package structure/numbers/local downloads and automated accessibility are checked, but Office/manual usability are not established.

Ruling: practitioner usefulness and live AI performance are not established — synthetic-only demonstration is the approved boundary; Beck's rehearsal and practitioner validation are external human acceptance activities.

## Final local release gate

1 October 2026 (local): `corepack pnpm verify` exit 0. Formatting, lint, strict types, secret scan and production build pass; 365/365 unit tests in 99 files and 87/87 browser tests at desktop, tablet and mobile pass. Both presentation journeys, saved assessment regressions, source imports, migration retention, stale writes, recovery, simulation, exports and automated accessibility were exercised. Review findings were fixed in one pass; targeted regressions passed before this full run.

Ruling: integration and production publication follow Beck's explicit Day 7 deployment request and AGENTS.md's squash-to-main workflow. No dependency/Node upgrades or new paid/provider integrations are introduced. Existing unrelated worktrees remain untouched.
