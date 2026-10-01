# AI Transformation OS

Beck's independent AI delivery demonstration: two connected client journeys from an evidence-backed investment thesis to a measured, accountable decision. Built for an interview discussion, **not a Sia product or proof of real client results**.

## Two engagements, not a catalogue

- **Support Operations Copilot:** compare rules, a human-reviewed copilot and an uneconomic automation proposal; resolve an adoption conflict; inspect incorrect suggestions; manage a low-adoption pilot.
- **Executive Reporting Automation:** reconcile conflicting figures, reduce reporting effort, retain publication review, and distinguish capacity value from cash savings.

## Working demo capabilities

Editable evidence reviews and workshop notes; weighted annual CSV baseline import; deterministic ROI, hours/FTE capacity, upfront investment, OPEX, payback, three-year economic and cash-only NPV; costed solution alternatives; scenarios, sensitivity and 10,000-sample uncertainty analysis; inspectable fixture evaluation; dependent milestones, risks, budget and actual spend; pilot measurements; policy-gated decisions with revision snapshots; history; sponsor view; current-state Markdown brief and editable six-slide PowerPoint; JSON backup, validation, recovery and reset.

The default public entry opens `/demo` **without email, API keys, paid services or a hosted database**. Changes persist in this browser. Back up before switching devices or clearing site data.

## Consulting assessment workbench

`/workbench` is a separate, synthetic-only assessment workspace. The public two-engagement `/demo` and its exports remain independent. The workbench supports blank engagements and Support/Reporting templates, USD/GBP/EUR (without FX conversion), Brief, Evidence, Options & Value, Recommendation and Deliverables.

Save discovery, process steps, evidence requests and reviewed source excerpts; compare business as usual, process/rules, assistance and automation using the shared 36-month financial engine. Owned assumption revisions, saved what-if scenarios, local seeded simulations, readiness gates and immutable recommendation snapshots retain the evidence behind a decision. Editing a source does not silently update numerical assumptions. Unsaved editor values never enter a recommendation export.

Deliverables prepares one explicit payload for the on-screen Markdown preview, Markdown investment brief, eight-slide editable PowerPoint and nine-sheet Excel review workbook. Choose the current saved draft or a reviewed historical snapshot. Historical facts, currency, evidence and validation stay together, with a separate current-revision/staleness marker. Incomplete economics remain labelled draft/Not assessed even in a reviewed recommendation. Internal notes are excluded by default; opting in includes them in the selected deliverables. Long slide text points to full workbook records. Workbook numbers are computed values, with formula definitions in Methods; it is not another financial engine.

Everything entered stays in this browser: no uploads, live AI, provider calls or hosted assessment database. Application assets still load from the site. The version 2 workspace uses transactional IndexedDB and rejects stale writes. Full JSON backup/restore includes internal notes and historical records, so it is a recovery file rather than a sanitized client deliverable. Restore validates the version and data before an explicit replacement confirmation. Optional legacy migration preserves the original demo record; unknown alternatives stay unknown. Corrupt records remain downloadable without being overwritten; restore a validated backup in a clean browser profile for recovery. Browser storage is neither encrypted nor a multi-user audit system—use synthetic data only.

Remaining limits: projections depend on entered assumptions and evidence reviews, simulations omit correlations, and there is no tax/FX model, live model evaluation or certified control assessment. Automated checks do not establish practitioner usefulness or native PowerPoint visual compatibility. Human validation is **not conducted**; see the [three-to-five-practitioner validation protocol](docs/assessment-practitioner-validation.md). Deployment/release acceptance remains a separate final verification step.

## Run locally

Node.js 22+ and pnpm 10.33.2. Existing dependencies are locked in `pnpm-lock.yaml`.

```powershell
corepack pnpm install --frozen-lockfile
$env:DEMO_MODE = "true"
$env:DEMO_SESSION_SECRET = "local-interview-demo-session-secret-2026"
corepack pnpm dev
```

Open [the local demo](http://localhost:3000/demo). For deployment, configure `DEMO_MODE=true` and a private, randomly generated `DEMO_SESSION_SECRET` in Vercel. Never commit real credentials. The existing GitHub main branch is connected to the Vercel project.

## Rehearse

Use [the five-minute walkthrough](docs/interview-walkthrough.md). Lead with the client's decision, demonstrate one assumption change and a setback, then export the resulting steering pack. All seed sources, model suggestions and sample pilot outcomes are explicitly synthetic.

## Important boundaries

- No live AI calls, Google sync, outbound actions or external approvals. Local fixture scores demonstrate an evaluation method, not model performance.
- Financial outputs are projections from editable assumptions, not verified client savings. Released hours are capacity; only an explicitly modeled subset is cash benefit. Cash is never added twice.
- Initial investment is a planning amount, not an accounting capitalization decision.
- Decisions are append-only through the UI, but local storage is not tamper-proof, encrypted or multi-user access-controlled. Do not enter confidential or regulated information.
- Uncertainty summaries are temporary previews; saved inputs, decisions, evidence, measurements and history survive reload. Backup/restore transfers the two project records.
- Legacy enterprise modules and migrations remain in the repository but are not operational surfaces of this release. Real database/RLS acceptance and provider integration were explicitly deferred.

## Verification

```powershell
corepack pnpm verify
```

Runs formatting, lint, strict types, unit tests, source secret scan, production build, and Playwright at 1440px, 1024px and 390px. Browser tests include all six workspace surfaces in automated WCAG A/AA checks, keyboard dialog focus, calculations, persistence and downloads. This does not claim a complete manual screen-reader audit. `verify:full` also requests database tests; they are outside this credential-free release.

The formatting command targets project directories explicitly so inaccessible agent-tool folders are not traversed. See [architecture](docs/architecture.md) and [release scope](docs/interview-release.md).
