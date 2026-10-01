# Task 3A — engagement and evidence journey

Status: DONE_WITH_CONCERNS (2026-10-01): Task 3A implemented and verified in the isolated `codex/consulting-assessment` worktree; worktree newline normalization and default Turbopack integration caveats below. Review base: `935954c`. No push or deployment. Controller-owned `docs/assessment-implementation.md` and `docs/assessment-task-3a.md` are excluded from the task commit.

## Implemented scope

Provider-free `/workbench`, a proxy-overwritten rendering header, server context lookup bypass, legacy chrome bypass, and full-document links between the two surfaces. No new packages, credentials, providers, backend writes or changes to the legacy storage key.

Warm Inter shell, engagement work queue, blank and both synthetic template creation, selection, duplication, archive/restore, contrast-safe brand presets, local opening/recovery state, native IndexedDB commits and stale-write recovery. Drafts persist by record/form key across navigation, with before-unload warning. Saved is displayed only after repository transaction completion.

Editable Brief, seven discovery categories, process rows, explicit currency acknowledgement, readiness context; evidence source creation/edit/version/review, review rationale, pending/missing source status, escaped source/internal notes, requests; local CSV/XLSX file selection/drop, sheet/mapping/period/unit preview, original physical source rows and explicit shared-baseline apply with pending evidence and assumption revisions.

Full JSON workspace backups are labelled as including internal notes and legacy records, distinct from client deliverables. Validated restore requires explicit replacement acknowledgement. Legacy migration requires raw backup and preview, works only into an empty v2 store, and has a separate reviewed flag without changing the old key.

Corrupt IndexedDB remains read-only with untouched diagnostic raw download. Per controller ruling, resumption uses a previously validated backup in a clean browser profile while preserving the original corrupt record. Reopening alone does not repair corrupt records. Repository contracts remain unchanged; synchronous open errors now have the same permissions/reopen guidance as asynchronous errors.

## Implemented interfaces

`src/modules/assessment/ui/surface.ts` exports:

```ts
type Section = "brief" | "evidence";
type NavigationTarget = {
  section: Section;
  engagementId?: string;
  opportunityId?: string;
  recordId?: string;
};
type InspectorContent = { title: string; content: ReactNode };
type SaveEngagement = (
  detail: string,
  update: (draft: Engagement) => void,
) => Promise<Engagement>;
interface SurfaceProps {
  engagement: Engagement;
  opportunity: Opportunity | null;
  busy: boolean;
  save: SaveEngagement;
  navigate: (target: NavigationTarget) => void;
  inspect: (content: InspectorContent) => void;
  recordId?: string;
}
```

Save mutators receive a cloned current engagement through `reviseEngagement`, and await `repository.save` against the controller's current workspace revision. They reject on failure and never automatically overwrite a stale tab. `ui/use-workspace.ts` owns repository lifecycle; `ui/drafts.tsx` exposes `DraftProvider`, `useDraft<T>` and `useDrafts`. `ui/recovery.tsx` exports `CommitWorkspace` for validated whole-workspace operations. `ui/operations.ts` adapts source edits/reviews/import preview results into existing domain types; it does not reimplement persistence or economics.

## RED / GREEN evidence observed

- `node node_modules/vitest/vitest.mjs run src/proxy.test.ts src/components/shell/workspace-shell.test.tsx src/modules/assessment/repository.test.ts src/modules/assessment/ui/operations.test.ts`: RED — new route redirected, overwritten header absent, provider lookup executed, synchronous storage error only said `Denied`, operations module absent. GREEN — 24 tests / 4 files passed, 1.40s.
- `node node_modules/vitest/vitest.mjs run src/modules/assessment/ui/brief.test.tsx`: RED — Brief module absent. GREEN — 2 tests passed (draft retention, blanks, currency acknowledgement, revision service). Later h1 regression RED — only h2 existed; GREEN — 2 tests passed, 1.47s.
- With webpack dev on port 3101: `$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3101'; node node_modules/@playwright/test/cli.js test tests/e2e/assessment.spec.ts --project=desktop --grep 'blank engagement' --timeout=15000`: RED — missing new-engagement UI before route implementation. Initial browser integration then exposed navigation accessible names including numeric prefixes; explicit accessible names fixed them. Desktop blank/import/review/reload and accessibility journey: 2 passed, 9.2s.
- Expanded desktop fault/lifecycle run: 8 passed / 2 failed; failures were test locators (`getByLabel` exact on wrapped select and Next's additional route-announcer alert). Narrow accessible-role/component selectors fixed these; focused `--grep 'templates|malformed'`: 2 passed, 5.9s.
- `--project=tablet --project=mobile` on the first ten assessment cases completed successfully: persisted `test-results/.last-run.json` says `passed`, no failed tests. The long-run console session did not survive a usage interruption; final production run will replace this provisional evidence.
- Tablet process-row regression RED: action column was 55.578125px, below the required usable width. `.aw-process-action` min-width and no-wrap fixed accidental vertical label wrapping. Focused tablet accessibility/row-size/drawer check GREEN: 1 passed, 4.6s.
- `--project=desktop --grep 'manual source|XLSX|version change' --timeout=45000`: 3 passed, 5.8s. Includes real sparse XLSX sheet import, manual evidence version/review reset with escaped text, native version-change closure plus asynchronous open failure without resetting persisted data.
- `node node_modules/vitest/vitest.mjs run`: 295 tests / 83 files passed in 16.62s on 2026-09-29, before the new webpack config regression. No warnings in this unit output.
- Scoped ESLint over assessment UI/controller, repository boundary/tests, route/proxy/shell changes, demo link and assessment E2E passed.

Browser tests use production native IndexedDB via the UI. Fault tests intercept a native put to abort its real transaction, and produce an actual native `ConstraintError` request; they do not substitute successful storage. Commit timing observes the native completion event before the repository callback updates Saved. Two actual pages test stale writes and stale restore. Other coverage includes valid empty-store restore, corrupt raw preservation, both templates, process/economics independence, archive/restore, duplicate, explicit migration, malicious restored brand fallback and local-content request sentinel.

## Current build blockers and approved resolution

The existing node_modules is a junction; default Turbopack rejects it as outside the checkout root. A temporary common-root configuration was explicitly rejected by automatic approval review because it broadened resolution to the user home; that edit was NOT applied and is abandoned. Dependencies and original checkout remain untouched.

The controller's production `next build --webpack` found legacy `pptxgenjs` dynamic `node:fs`/`node:https` imports hitting webpack's unsupported URL-scheme handler, although the package's browser map excludes them. The approved alternative is a client-only IgnorePlugin scoped to exactly those two resources from the pptxgenjs package directory. Installed Next webpack documentation was read. `src/lib/webpack-config.test.ts` RED captured: 2 tests failed because `nextConfig.webpack` was not a function. GREEN: 2 passed in 1.76s, including matching/nonmatching resources/packages and unchanged server behavior.

A production build then confirmed the legacy process page's unsupported extra `ProcessPageContent` export. The approved sibling-component extraction preserves its implementation and server capability check; only the existing test import changes. Both integration fixes are separate from new assessment features.

## Integration verification history

2026-09-30 integration checkpoint: the approved scoped webpack IgnorePlugin is implemented; `node node_modules/vitest/vitest.mjs run src/lib/webpack-config.test.ts` passed 2 tests in 1.76s. Production compilation succeeded, then confirmed `ProcessPageContent` was an unsupported extra Next page export. The exact component was moved into `src/app/processes/[id]/process-page-content.tsx`, leaving the route's default component and capability check unchanged. Existing page tests now import that sibling. Targeted page/config tests passed 4 tests / 2 files in 1.99s; standalone TypeScript passed. `node node_modules/next/dist/bin/next build --webpack` then passed: compiled in 10.1s, TypeScript in 8.3s, 35 static-page generation steps, `/workbench` included in the typed route listing.

Production browser command `node node_modules/@playwright/test/cli.js test --project=desktop --grep 'stale saves|public entry|support case' --timeout=30000` passed the public-entry/legacy-link test and the real legacy support journey including PPTX download. An additional self-review regression found two stale inline errors remained after confirmed reload (expected zero). Recovery now remounts form/backup state and clears inspector context on confirmed reload or restore. The regression is retained for the final run; rebuild in progress.

2026-10-01 checkpoint: initial/reloaded workspace now opens the work queue, not the first engagement. `node node_modules/@playwright/test/cli.js test tests/e2e/assessment.spec.ts --project=desktop --grep 'blank engagement' --timeout=20000` RED: expected Engagement work queue, received Engagement brief. Minimal initial-home state correction retained explicit engagement selection and creation navigation. GREEN in full browser run.

Fresh final checks:

- `node node_modules/next/dist/bin/next build --webpack`: PASS, compilation 10.8s, TypeScript 9.9s, 35 static-generation steps; `/workbench` included. Includes stale-error remount and queue-entry fixes.
- `node node_modules/vitest/vitest.mjs run`: PASS, 297 tests / 84 files, 15.70s.
- `node node_modules/eslint/bin/eslint.js . --max-warnings=0`: PASS, exit 0.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: PASS, exit 0.
- `node scripts/secret-scan.mjs`: `Secret scan passed.`
- `node node_modules/prettier/bin/prettier.cjs --check --ignore-unknown "*.{json,md,ts,mjs}" src tests docs scripts supabase`: FAIL, 252 unchanged worktree files flagged. Controller subsequently identified checkout CRLF conversion (not baseline source style) as the cause; details below. No unrelated formatting applied. Scoped check of all task files passes.
- `node node_modules/@playwright/test/cli.js test --timeout=45000`: first run 48 passed / 3 failed (1.2m). All three were the empty-store restore test assuming automatic Brief entry, contrary to the corrected queue default. The test now verifies queue then explicitly opens the restored engagement, preserving revision/content assertions. Final rerun in progress.

Final rerun of `node node_modules/@playwright/test/cli.js test --timeout=45000`: **51 passed (1.0m)**, exit 0. This is 36 assessment journeys plus all 15 legacy journeys across 1440×900, 1024×768 and 390×844. Native stale-write, stale-restore, commit timing, abort, request failure, version change, synchronous denial, corrupt preservation and empty-store restore all pass. Legacy support journeys download actual PPTX at all three sizes. Browser output has only the existing Node `NO_COLOR` ignored because `FORCE_COLOR` is set warning; no test failures remain.

Formatting caveat: representative unchanged paths flagged by the global command are `AGENTS.md`, `package.json`, `playwright.config.ts`, `src/app/layout.tsx`, and `tests/e2e/accessibility.spec.ts`. `git diff --name-only --` over those paths returned empty. The global output ends `Code style issues found in 252 files.` Controller diagnosis during round 1: those five files pass the same check in the original checkout; no Prettier config exists in either checkout. `package.json` has CRLF0/LF85 in the original versus CRLF85/LF0 here, with `core.autocrlf=true`. Therefore this is worktree checkout newline conversion, not pre-existing source-style debt. Broad newline normalization is deferred to integration; no dependency/config baseline rewrite was applied. Exact scoped GREEN command:

```powershell
node node_modules/prettier/bin/prettier.cjs --check next.config.ts src/app/workbench "src/app/processes/[id]" src/lib/webpack-config.test.ts src/modules/assessment/ui src/modules/assessment/workbench.tsx src/modules/assessment/repository.ts src/modules/assessment/repository.test.ts src/components/shell/app-shell.tsx src/components/shell/workspace-shell.tsx src/components/shell/workspace-shell.test.tsx src/modules/demo-workspace/synthetic-replay-workbench.tsx src/proxy.ts src/proxy.test.ts tests/e2e/assessment.spec.ts tests/e2e/governance.spec.ts docs/assessment-task-3a-report.md
```

Output: `All matched files use Prettier code style!` `git diff --check` passes (Git prints only Windows LF/CRLF normalization notices). Default `pnpm verify` is not claimed: default Turbopack requires integration verification with dependencies inside the checkout root, and the baseline global formatting check is not green. No database/backend suite was run because this slice is browser-local and makes no backend changes.

## Files and self-review

- Route and trusted rendering boundary: `src/app/workbench/page.tsx`, `src/proxy.ts`, `src/proxy.test.ts`, `src/components/shell/app-shell.tsx`, `workspace-shell.tsx`, `workspace-shell.test.tsx`.
- Controller: `src/modules/assessment/workbench.tsx`; focused UI modules under `src/modules/assessment/ui/`: `surface.ts`, `use-workspace.ts`, `drafts.tsx`, `fields.tsx`, `operations.ts`, `work-queue.tsx`, `recovery.tsx`, `brief.tsx`, `process-editor.tsx`, `evidence.tsx`, `baseline-import.tsx`, `inspector.tsx`, `workbench.css`, `operations.test.ts`, `brief.test.tsx`.
- Storage error boundary: `src/modules/assessment/repository.ts` and `repository.test.ts`.
- Preserved-demo link: `src/modules/demo-workspace/synthetic-replay-workbench.tsx`; `tests/e2e/governance.spec.ts` adds only a useful-link assertion. New native/browser coverage: `tests/e2e/assessment.spec.ts`.
- Approved integration corrections: `next.config.ts`, `src/lib/webpack-config.test.ts`, `src/app/processes/[id]/page.tsx`, `process-page-content.tsx`, `page.test.tsx`.
- This report. No package manifests, lockfiles, dependency junctions, original-checkout files, or controller docs changed by this implementation.

Self-review confirmed path-based authorization precedes the overwritten rendering header; no provider lookup on the workbench; full-document surface navigation; revision-checked awaited commits; unsaved drafts retained on navigation and failed writes; no automatic corrupt reset; escaped source text; safe restored accent fallback; service-backed shared baseline updates; no numeric change from evidence acceptance or process edits. Stale recovery remounts local errors/forms and clears stale inspector context. Initial/reloaded workspace opens its queue and creation still opens the created engagement. No tour or inactive future-section controls.

The frontend-design skill guided consistent warm canvas/Inter hierarchy, compact process rows, visible primary heading, and single-column mobile controls. Inspected final desktop Brief/Evidence, tablet Brief, and mobile Brief/Evidence screenshots; no clipping beyond intentional locally scrollable process tables or accidental tall process rows. Axe and whole-page overflow assertions pass for both implemented surfaces at all three sizes; smaller inspector dialogs pass keyboard containment/Escape/focus-return checks.

## Screenshot handoff

All paths are under `C:/Users/behzo/.codex/worktrees/consulting-assessment/AI Transformation Platform/` and are test output artifacts (not committed):

- `test-results/assessment-implemented-sur-52c60-ctor-returns-keyboard-focus-desktop/brief-desktop.png`
- `test-results/assessment-implemented-sur-52c60-ctor-returns-keyboard-focus-desktop/evidence-desktop.png`
- `test-results/assessment-implemented-sur-52c60-ctor-returns-keyboard-focus-tablet/brief-tablet.png`
- `test-results/assessment-implemented-sur-52c60-ctor-returns-keyboard-focus-tablet/evidence-tablet.png`
- `test-results/assessment-implemented-sur-52c60-ctor-returns-keyboard-focus-mobile/brief-mobile.png`
- `test-results/assessment-implemented-sur-52c60-ctor-returns-keyboard-focus-mobile/evidence-mobile.png`

## Remaining cross-slice work

Finance/recommendation surfaces belong to Task 3B; deliverable payloads/export internals belong to Task 4. Extend `Section` and consume the typed selected-record/save/navigation/inspector boundary above. No legacy financial overflow remediation was folded into 3A. Corrupt storage recovery remains deliberately read-only; raw corrupt data is diagnostic, not a validated restore backup. Default Turbopack build and baseline formatting need integration-owner verification as described above. No independent review was dispatched; controller owns that review after this report and commit.

## Review round 1 — 2026-10-01

Reviewed head `f4abbff`, fix base `6745115`. The two important findings were confirmed: rendered inspector snapshots remained beside newer saved records, and shared template/duplicate creation erased the unrelated new-engagement name draft.

The controller now clears inspector content/open state only after an awaited successful engagement save. Reopening derives fresh source version/status/excerpt/review or readiness/history from the committed record. Failed saves never reach this clearing step. WorkQueue resets the name draft only for successful blank creation, the sole path consuming that draft; template and duplicate creation preserve it.

RED: `node node_modules/@playwright/test/cli.js test tests/e2e/assessment.spec.ts --project=desktop --grep 'inspector snapshots|unrelated engagement' --timeout=30000`: 2 failed in 9.1s. Old readiness inspector remained (expected count 0, received 1); new-engagement name became empty instead of `Unfinished blank name`.

Focused checks: `node node_modules/vitest/vitest.mjs run src/modules/assessment/ui/brief.test.tsx src/modules/assessment/ui/operations.test.ts src/modules/assessment/repository.test.ts`: 12 passed / 3 files, 1.96s. `node node_modules/eslint/bin/eslint.js src/modules/assessment/workbench.tsx src/modules/assessment/ui/work-queue.tsx tests/e2e/assessment.spec.ts --max-warnings=0`: exit 0. Production `node node_modules/next/dist/bin/next build --webpack`: PASS, compilation 11.9s and TypeScript 8.9s. Scoped Prettier and `git diff --check` pass.

Browser verification: `node node_modules/@playwright/test/cli.js test tests/e2e/assessment.spec.ts --grep 'inspector snapshots|unrelated engagement|native commit|stale saves|implemented surfaces' --timeout=45000` returned 12 passed / 3 failed (1.7m). The three failures were an exact-label selector issue on the wrapped source-excerpt textarea; the accessible textbox was present. Regression locator corrected to the textbox role, not production markup. Focused rerun `node node_modules/@playwright/test/cli.js test tests/e2e/assessment.spec.ts --grep 'inspector snapshots' --timeout=20000 --output=test-results/review-inspector`: **3 passed (6.7s)**. Together these cover both fixes plus native failed-save/stale-write preservation and responsive/keyboard behavior at all three viewports; no full-suite rerun was needed for this narrow review. Existing screenshot paths above were refreshed by the responsive cases.

Self-review: only successful awaited saves clear snapshots, so errors and unsaved drafts remain intact on failed writes. Source inspector is explicitly reopened and checked against pending version 2 and then accepted version 2 with the new excerpt and rationale; readiness/history is reopened after mutation and shows its new commit. Both template buttons and duplicate creation preserve an unrelated name; successful blank creation consumes and resets it. The external shell sets `NO_COLOR=1`, while the browser runner sets FORCE_COLOR for child processes; no runner configuration change was made for that non-blocking warning. Scoped commit includes only controller, work-queue, browser regressions and this report; controller-owned ledger excluded.
