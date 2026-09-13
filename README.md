# AI Transformation OS

Beck's independent AI delivery demonstration: two connected client journeys from an evidence-backed investment thesis to a measured, accountable decision. Built for an interview discussion, **not a Sia product or proof of real client results**.

## Two engagements, not a catalogue

- **Support Operations Copilot:** compare rules, a human-reviewed copilot and an uneconomic automation proposal; resolve an adoption conflict; inspect incorrect suggestions; manage a low-adoption pilot.
- **Executive Reporting Automation:** reconcile conflicting figures, reduce reporting effort, retain publication review, and distinguish capacity value from cash savings.

## Working demo capabilities

Editable evidence reviews and workshop notes; weighted annual CSV baseline import; deterministic ROI, hours/FTE capacity, upfront investment, OPEX, payback, three-year economic and cash-only NPV; costed solution alternatives; scenarios, sensitivity and 10,000-sample uncertainty analysis; inspectable fixture evaluation; dependent milestones, risks, budget and actual spend; pilot measurements; policy-gated decisions with revision snapshots; history; sponsor view; current-state Markdown brief and editable six-slide PowerPoint; JSON backup, validation, recovery and reset.

The default public entry opens `/demo` **without email, API keys, paid services or a hosted database**. Changes persist in this browser. Back up before switching devices or clearing site data.

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

For an on-screen presentation, select **Start guided tour · Начать тур** in the demo toolbar. The ten-step tour navigates both projects, highlights the relevant surface, and provides “what to show” and “what to say” notes in Russian or English. Allow 5–7 minutes plus discussion. Notes are visible to the audience when screen sharing. The tour never edits records or executes actions: changes and decisions remain yours. Manual navigation pauses the tour; Resume returns to the same step, and Escape closes it. Reloading ends the tour but preserves previously saved demo changes.

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
