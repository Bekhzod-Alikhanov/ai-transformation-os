# Task 6 — Visual system, search, truthful scope, and browser coverage

## Summary

Refined the credential-free Sia Partners Synthetic Replay into a dense, editorial evidence desk rather than a broad project dashboard. The `/demo` journey remains limited to Support Triage, Executive Reporting, and Procurement Analysis. It now has real local search, a responsive evidence inspector, explicit local/recovery boundary copy, and demo-only navigation that does not offer provider, API, or database controls.

## Visual and interaction changes

- Retained the warm off-white, ink, cobalt, teal, amber, and crimson system. The workbench continues to use evidence ledgers, compact economics tables, progress/timeline-like committee events, and a contextual inspector rather than decorative card grids.
- Added a real search index over cases, synthetic sources, accepted evidence, synthetic opportunities/use cases, decisions, and local activity. Result activation selects the matching case and records a useful notice.
- The inspector is an accessible, explicit disclosure below `xl` (therefore at 1024px and 390px) and remains a third pane at larger sizes. Source review, assumption revision/economics, CFO action history, and decision recording remain in the primary reading order at 390px.
- The existing four-minute Support Triage prompt is retained as the guided hero path. Search-empty, custom-scenario error, reset confirmation, and malformed/old-state recovery copy are all visible and local-only.
- Synthetic Replay shell navigation exposes only `/demo`, changes its identity to Sia Partners Synthetic Replay, and hides Control Tower, notifications, profile, integrations, approvals, automations, and other provider-era destinations from the replay surface.

## Documentation

`README.md` now describes the credential-free Sia demo, the three-case scope, browser-local persistence/reset, and no provider setup. `docs/architecture.md` records the isolated `DemoWorkspaceStore`, its local persistence/recovery boundary, the summary-only simulation data, and the intentionally client-side interaction boundary.

## Docs read

- `.superpowers/plans/evidence-workbench-rebuild.md` (Task 6)
- `node_modules/next/dist/docs/app/getting-started/server-and-client-components.md`
- `node_modules/next/dist/docs/app/getting-started/linking-and-navigating.md`
- `C:/Users/behzo/.agents/skills/frontend-design/SKILL.md`
- `C:/Users/behzo/.codex/plugins/cache/claude-plugins-official/superpowers/6.3.0/skills/test-driven-development/SKILL.md`

## TDD evidence

Observed RED before implementation:

```powershell
.\node_modules\.bin\vitest.CMD run src/modules/demo-workspace/demo-workspace-store.test.ts src/modules/demo-workspace/synthetic-replay-workbench.test.tsx src/components/shell/app-shell.test.tsx
```

The added tests failed because `searchDemoWorkspace`, the local replay searchbox, and Synthetic Replay-only shell navigation did not exist. A later focused RED for the inspector toggle failed with the missing `Open evidence inspector` control.

GREEN after implementation/refactor:

```powershell
.\node_modules\.bin\vitest.CMD run src/modules/demo-workspace/demo-workspace-store.test.ts src/modules/demo-workspace/synthetic-replay-workbench.test.tsx src/components/shell/app-shell.test.tsx
.\node_modules\.bin\tsc.CMD --noEmit
```

Result: 3 files / 15 focused tests passed; full unit verification passed 71 files / 184 tests; strict TypeScript completed without errors. The store test verifies every local-search category; component tests cover selecting Support Triage from search and opening the responsive inspector; shell tests assert provider routes are not rendered in Synthetic Replay.

## Browser/a11y coverage

Replaced stale provider-era Playwright journeys with `/demo` coverage for all configured projects (1440px desktop, 1024px tablet, and 390px mobile): Support Triage search → economics → committee → CFO resolution → Beck decision, reset/recovery, keyboard search focus, and Axe serious/critical violations. `playwright.config.ts` now accepts `PLAYWRIGHT_BASE_URL` for a separately started server.

Chromium was already installed locally. The attempted desktop run used the existing `http://127.0.0.1:3024` dev server but its `/api/auth/demo` endpoint returned 503 because it was started without `DEMO_SESSION_SECRET`; it also owns the worktree Next dev lock. That user-owned process was not stopped. Browser acceptance is therefore pending a fresh production server with the documented temporary local test environment, not a browser-install blocker.

## Verification

Passed:

```powershell
.\node_modules\.bin\vitest.CMD run src/modules/demo-workspace/demo-workspace-store.test.ts src/modules/demo-workspace/synthetic-replay-workbench.test.tsx src/components/shell/app-shell.test.tsx
.\node_modules\.bin\vitest.CMD run
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run secret:scan
.\node_modules\.bin\prettier.CMD --check README.md docs\architecture.md playwright.config.ts src\components\shell\app-shell.test.tsx src\components\shell\app-shell.tsx src\modules\demo-workspace\demo-workspace-store.test.ts src\modules\demo-workspace\demo-workspace-store.ts src\modules\demo-workspace\synthetic-replay-workbench.test.tsx src\modules\demo-workspace\synthetic-replay-workbench.tsx tests\e2e\accessibility.spec.ts tests\e2e\hero-journey.spec.ts
```

The production build completed successfully. Secret scan passed. A scoped demo provider/network scan found no `googleapis`, `createSupabase`, `openai`, `inngest`, or `fetch(` runtime matches in the demo route, demo workspace module, or shell. `git diff --check` passed.

Deferred low-risk checks: the existing evidence migration already owns `parent_evidence_id`, and `ApprovalService.canonicalise` already recursively canonicalises arrays and sorted object entries, so neither was changed.

## Files

- `src/modules/demo-workspace/demo-workspace-store.ts`
- `src/modules/demo-workspace/demo-workspace-store.test.ts`
- `src/modules/demo-workspace/synthetic-replay-workbench.tsx`
- `src/modules/demo-workspace/synthetic-replay-workbench.test.tsx`
- `src/components/shell/app-shell.tsx`
- `src/components/shell/app-shell.test.tsx`
- `tests/e2e/hero-journey.spec.ts`
- `tests/e2e/accessibility.spec.ts`
- `playwright.config.ts`
- `README.md`
- `docs/architecture.md`

## Commit

Recorded after verification in the Task 6 implementation commit.

## Review fix round 1

### Findings addressed

1. Replaced the stale provider-era `tests/e2e/governance.spec.ts` coverage with two credential-free `/demo` browser checks: category-specific local search content and responsive inspector behavior across desktop, tablet, and mobile breakpoints.
2. Made local replay search categories genuine instead of duplicated. `case` search now matches case title/summary, while `use_case` search matches distinct local use-case title/summary records such as `Support Queue Copilot`, so browser and unit coverage no longer rely on the same case fields for both categories.
3. Tightened ambiguous Playwright selectors in the hero journey and reset flow so the suite targets the exact Support Triage case result, committee progress line, and recorded-decision confirmation rather than overlapping `Case`/`Use Case`, `simulated cost`, or repeated `decision recorded locally` text.
4. Raised `/demo` secondary text contrast coherently by darkening the muted label/caption/source ramp used in the guided path, evidence ledger, economics labels, committee citations, and inspector headings. Axe serious/critical color-contrast failures are now cleared without changing the overall warm off-white visual system.
5. Replaced the broken stale production server on `http://127.0.0.1:3031` after confirming it was serving current build assets with HTTP 500s. A fresh local `next start` instance from this worktree was then used for the final Playwright verification run.

### RED → GREEN evidence

1. `src/modules/demo-workspace/demo-workspace-store.test.ts` RED: `use_case` search still returned `Support Triage` plus the generic `Synthetic opportunity / use case`; GREEN: the store now returns distinct `Support Queue Copilot` use-case content.
2. `src/modules/demo-workspace/synthetic-replay-workbench.test.tsx` RED: the responsive search/assertion path could not find the distinct use-case record; GREEN: search now exposes separate `Support Triage · Case` and `Support Queue Copilot · Use Case` entries.
3. Playwright RED on August 31, 2026 against `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3031`: all 15 checks initially failed from provider-era governance coverage, ambiguous hero selectors, and Axe serious contrast violations; GREEN after the fixes and server refresh: all 15 desktop/tablet/mobile checks passed.

### Browser verification

- Production server: rebuilt locally with `corepack pnpm build`, then restarted on `http://127.0.0.1:3031` with demo credentials after identifying stale asset 500s on `/_next/static/chunks/29__jtrp4ndou.css` and `/_next/static/chunks/3u6fgt1n--in7.js`.
- Final Playwright command on August 31, 2026:

```powershell
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3031'
.\node_modules\.bin\playwright.CMD test tests/e2e/hero-journey.spec.ts tests/e2e/accessibility.spec.ts tests/e2e/governance.spec.ts
```

- Result: `15 passed` across `desktop`, `tablet`, and `mobile`.

### Additional verification

- Focused unit tests:

```powershell
.\node_modules\.bin\vitest.CMD run src/modules/demo-workspace/demo-workspace-store.test.ts src/modules/demo-workspace/synthetic-replay-workbench.test.tsx
```

- Result: `2` files / `14` tests passed.
- `corepack pnpm lint` passed.
- `corepack pnpm typecheck` passed.
- `corepack pnpm build` passed before the final browser rerun and produced the `/demo` route used by Playwright.

### Files updated in this round

- `src/modules/demo-workspace/demo-workspace-store.ts`
- `src/modules/demo-workspace/demo-workspace-store.test.ts`
- `src/modules/demo-workspace/synthetic-replay-workbench.tsx`
- `src/modules/demo-workspace/synthetic-replay-workbench.test.tsx`
- `tests/e2e/governance.spec.ts`
- `tests/e2e/hero-journey.spec.ts`
- `.superpowers/sdd/evidence-workbench-rebuild/task-6-report.md`

### Commit

- `be39da7 fix: repair demo browser acceptance coverage`

### Final acceptance stabilization

Fresh whole-matrix verification found a hydration race only under six-worker parallel browser load: server-rendered controls were visible before React attached their event handlers. The workbench now exposes a readiness marker after its client subscription is established, and every browser journey waits for that condition before interacting. The targeted desktop journey passed serially, followed by a full parallel run with all 15 desktop/tablet/mobile tests passing.
