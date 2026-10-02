# Architecture — connected investment demonstrator

## One active application

Next.js App Router renders the same `src/modules/assessment/workbench.tsx` on `/`, `/demo` and `/workbench`. Proxy headers bypass the legacy shell. Demo and workbench differ in persistence namespace/initial records, not capabilities. Legacy enterprise routes redirect to the demo in provider-free mode; their modules are not active product surfaces.

```mermaid
flowchart TD
  Root[Public / and /demo] --> UI[Assessment workbench / five connected sections]
  Personal[/workbench] --> UI
  UI --> Repo[Transactional IndexedDB repository]
  Repo --> Demo[beck-investment-demo / two resettable examples]
  Repo --> Saved[beck-assessment-workbench / saved synthetic assessments]
  UI --> Drafts[Retained editor and option drafts]
  Drafts --> Calc[Canonical Decimal.js economics]
  Repo --> Calc
  Calc --> Rules[Option comparison and readiness gates]
  Rules --> Snapshot[Human recommendation snapshot]
  Snapshot --> Payload[Allowlisted export payload]
  Payload --> Files[Markdown / eight-slide PPTX / XLSX]
```

## Versioned contracts and storage

Zod version 3 contracts add tasks, workshop questions, per-option suitability, decision policies and evaluation runs/events. Optional fields preserve aggregate records. Valid version 2 records upgrade through an in-memory validated copy; the first successful v3 transaction retains the raw original. Invalid versions never overwrite data. Transaction completion confirms a save; optimistic revisions reject stale-tab writes.

Legacy localStorage migration is explicit and retains its original. Backup restore validates before confirmation. Corrupt records are recoverable. Recovery backups include internal notes/history; client exports exclude internal notes by default. Browser storage is not confidential, encrypted or a multi-user audit guarantee.

## Calculations and decisions

`tasks.ts` models current work versus unused/ineligible work, assisted handling, review and exceptions. Negative released hours are retained. Shared baseline edits propagate to task-mode alternatives, preserving option-specific effort and adoption. Aggregate cases remain aggregate until explicitly converted.

`economics.ts` is the single financial authority: Decimal arithmetic, finite guards, capacity/cash separation, overlap checks, cost timing, 36 monthly incremental flows against BAU and sustained payback. Month-zero investment is the first-year ROI denominator; later investment remains in net flows. Seeded simulations store 10,000-draw summaries, histogram, signature and model version, not raw samples. No tax/FX/legal capitalization judgment is performed.

`decision.ts` ranks complete options by selected economic/cash NPV after budget, payback, suitability and control gates. Exact ties favour lower complexity. Missing material facts require investigation, unresolved AI value requires a pilot, and non-AI can win. `assessment.ts` and `model.recordRecommendation` enforce evidence, readiness and evaluation gates on separate human recommendations. Strategic exceptions retain adverse economics.

## Evidence, replay and handover

Manual excerpts and mapped imports stay local. Source review and assumption revision are distinct; workshop answers affect readiness without changing numbers. Workflow nodes are inspectable task responsibilities, not a general designer.

`evaluation.ts` replays fixed versioned Support cases, runs a local Decimal/Papa Parse reporting pipeline, and reconciles recorded reporting narration against a fixed dataset. Metrics compare expected/output rows. Timelines show sources, errors and human controls. Edited CSV receives deterministic calculations only, never invented AI output. Stored input revisions expose stale runs; unsafe releases gate investment.

`validation.ts` suggests a plan from actual baseline, gaps, sensitivity and failures. Review/edit/save is explicit. Recommendation snapshots retain historical facts; subsequent changes flag them for review.

## Deliverables and assurance

Focused export modules project one saved draft or captured snapshot into an allowlisted payload. Unsaved/live edits cannot leak into historical financial results. Current branding is an explicit rendering input. ExcelJS and PptxGenJS load on demand in-browser. Workbook sheets contain computed values and formula explanations, not a second engine; optional task/workshop/evaluation sheets retain detail. Eight slides use native editable objects and bounded text referencing full workbook records.

No entered content is sent to providers, databases, analytics or outbound connectors; site assets still load from the host. Verification includes deterministic/adverse calculations, persistence, migration, recovery, stale writes, replay, exports, browser journeys and automated accessibility. Vercel deploys from main. Provider/database acceptance, complete manual accessibility/Office validation and practitioner usefulness remain outside automated acceptance.
