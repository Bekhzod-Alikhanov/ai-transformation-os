# Interview release — two working client cases

Approved scope: Support Operations and Executive Reporting. Complete the local evidence → economics → delivery → measurement → decision → brief journey. No paid services, keys, cloud database, Google actions, or login.

One-week prioritisation: reuse the current stack, ship actual calculations and editable work, keep sample AI output explicitly synthetic. Defer arbitrary document ingestion, multi-user collaboration, large evaluation suites, agent orchestration, generic automation, and additional projects. CSV baseline intake, six to twelve reviewable examples, scenario comparison, pilot gates, and snapshot exports are sufficient for the interview.

Implementation ledger:

- Economics engine and tests: independent implementation in `delivery-workbench/economics`.
- Release tooling: independent repair of project-wide checks.
- Workspace: two distinct seeded projects, editable assumptions/evidence, plan, evaluation, outcomes and decisions.
- Persistence: versioned browser-local workspace independent of the expiring synthetic session; preserve legacy replay keys. JSON backup/restore with validation, recovery and reset.
- Outputs: Markdown decision brief and editable six-slide steering pack generated from current project state.
- Verification: business invariants, browser journeys at three widths, accessibility, build, secret scan, deployed checks.

Ruling: use existing browser-local persistence for the bounded interview dataset; no IndexedDB/file-blob subsystem is needed. Sources are small editable excerpts and CSV summaries. This keeps the week focused on useful delivery decisions.

Ruling: retain the expensive Support rollout as a deliberately weak option, and separately cost a limited copilot pilot. Never relabel a negative investment as approved scaling.

Verification notes (2026-09-13): all 15 browser acceptance tests passed against a local production server at 1440/1024/390px, including automated WCAG A/AA checks for all six surfaces. Development-server runs previously stalled; the acceptance configuration now starts the production build on port 3100 with two workers. Run `corepack pnpm verify` to build before testing. This is not a manual screen-reader certification.

Architecture tradeoffs: fixed authored evaluation fixtures replace live committee orchestration; a CSV baseline plus inspectable excerpts replace arbitrary document ingestion; browser-local history replaces a hosted database. Uncertainty summaries are temporary previews, while project inputs, reviews, measurements and decisions persist. Legacy enterprise adapters remain unprovisioned and hidden from the demo.
