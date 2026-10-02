# AI Transformation OS

Beck's investment decision and delivery demonstrator: should a synthetic client keep manual work, choose rules-based automation, or pilot human-reviewed AI? This is an independent interview prototype, not a Sia product or evidence of real client results.

## Two connected examples

- **Support Operations Copilot:** task-level baseline, costed alternatives, contractor-avoidance hypothesis, economic versus cash returns, an adverse adoption challenge, routing failures and a blocked unsupported answer.
- **Executive Reporting Automation:** a rules-based winner, executable local CSV reconciliation, and fixed recorded AI narration checked against the numerical ledger.

Open [the demonstrator](https://ai-transformation-os.vercel.app). `/` and `/demo` open populated Support without email, keys or paid services. [The workbench](https://ai-transformation-os.vercel.app/workbench) uses the same components and services for saved or blank synthetic assessments. Its records are separate from the resettable examples.

## Working capabilities

Five sections: **Decision Overview**, **Process & Evidence**, **Investment Comparison**, **Agent & Evaluation**, and **Pilot & Recommendation**.

Editable task effort and independent alternatives feed one Decimal.js engine. Draft adoption, review time, workload and cost changes recalculate hours released, FTE capacity, first-year net benefit/ROI, 36-month economic and cash-only NPV, sustained payback, break-even adoption and sensitivities. Scheduled costs include month-zero/later investment and recurring operations. Cash savings are a subset of capacity value, not an extra benefit. Unknown inputs, overlap and unachieved payback have distinct states.

Workshop answers, reviewed excerpts, mapped CSV/XLSX baselines and assumption revisions retain source context. Accepting evidence never silently changes a number. Visible value, budget, payback, suitability, evidence and control gates produce an advisory preference; the human recommendation is separate. Validation plans generated from actual gaps and failed evaluations require review, editing and explicit saving.

Clickable current/future workflows expose responsibility, sources, review and exceptions. Support execution is **Synthetic Replay**, not live AI. Reporting rules run locally on editable synthetic CSV; recorded AI comparisons only use their fixed dataset. Metrics are calculated from inspectable rows. Runs survive reload; stale or unsafe evaluations prevent an investment-ready recommendation.

Conservative/base/upside/custom scenarios and reproducible 10,000-draw simulation summaries retain their seed, signature and model version. Markdown, an editable eight-slide PowerPoint and an Excel review workbook use one selected saved revision or recommendation snapshot. Internal notes are excluded by default. Workbook values and formula explanations are a review artifact, not a second financial engine.

## Persistence and boundaries

Version 3 uses transactional IndexedDB with optimistic revision checks. Valid version 2 records load through a validated copy; the first version 3 save retains the original under `retained-version-2-original`. Legacy aggregate cases remain aggregate until explicitly converted to tasks. Backup/restore includes internal notes and history, validates before replacement, and rejects stale writes. Corrupt data has explicit recovery. Reset affects only the demo namespace.

Use **synthetic data only**. Browser storage is not encrypted, tamper-proof, confidential-client-ready or collaborative. No entered content is uploaded to AI, a database, Google or analytics. Site assets still load over the network. No live model performance, actual savings, accounting treatment or compliance certification is claimed. Simulation probabilities describe the chosen assumptions, not project success. Legacy enterprise and delivery modules remain outside the active workflow.

## Run and verify

Retain the locked dependencies; no framework or Node upgrade is part of this release.

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm dev
corepack pnpm verify
```

Verification runs formatting, lint, strict types, unit tests, secret scanning, production build and desktop/tablet/mobile Playwright journeys. Automated checks do not establish complete screen-reader conformance, native Office compatibility or practitioner usefulness. Database/provider tests are outside this provider-free release.

See [architecture](docs/architecture.md), [implementation ledger](docs/investment-demonstrator-progress.md), and [the written interview walkthrough](docs/interview-walkthrough.md). Previous acceptance reports describe earlier releases. Practitioner validation and Beck's live rehearsal remain separate human activities.
