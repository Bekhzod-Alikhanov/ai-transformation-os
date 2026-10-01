# Task 2 — transactional local records, migration and baseline import

Implemented the three provider-free browser services in `src/modules/assessment/`. No Task 1 schema, package, route, provider, legacy storage key or static Aster catalogue was changed. The production repository uses native IndexedDB only; there is no in-memory persistence fallback.

## Exported interfaces

`repository.ts` exports:

- `openRepository(): Promise<AssessmentRepository>` using database `beck-assessment-workbench`, version `1`, object store `workspace`, key `active`.
- `AssessmentRepository`: `load(): Promise<Workspace | null>`, `save(next: Workspace, expectedRevision: number | null): Promise<Workspace>`, and `close(): void`.
- `StaleWorkspaceError`, including `expectedRevision` and `actualRevision`.
- `CorruptWorkspaceError`, including `rawBackup: string | null` so the UI can offer the untouched raw local record when schema validation fails.
- `serializeBackup(workspace: Workspace): string` and `parseBackup(text: string): Workspace`.

Saves validate before opening the write transaction, compare the persisted revision and write the next revision in one read-write transaction, and resolve only from `transaction.oncomplete`. Initial creation requires `expectedRevision === null` and stores revision `1`. Stale, request, transaction, blocked-open and closed/version-changed paths reject with recovery guidance. Schema failure does not become an empty workspace and does not rewrite the corrupt record. Backups are limited to 20 MiB; unknown versions, invalid JSON and broken IDs/references are rejected before restore.

`migration.ts` exports `migrateLegacy(text: string): Workspace`. It validates with the existing v1 `restoreWorkspace`, creates two USD engagements, maps the saved selected option exactly, converts implementation cost to month 0 and annual run cost to a monthly amount over months 1–36, and shares only genuine baseline fields across all options. The v1 format contains no explicitly labelled saved alternative economics, so non-selected alternatives remain unknown instead of being reconstructed from static demo values. Evidence review state and synthetic/user-provided legacy provenance remain labelled. Each opportunity retains both a full labelled raw project clone, a labelled record of unmapped delivery/evaluation fields, and unchanged cloned legacy decisions. The pure function neither reads nor changes localStorage.

`imports.ts` exports:

- `readBaselineFile(file: File, sheetName?: string): Promise<ImportTable>`.
- `ImportTable`: `headers`, `rows`, `sourceName`, optional `sheetName`, `availableSheets`, and `rowNumbers` preserving original source rows after blank-record filtering.
- `previewBaseline(table: ImportTable, mapping: BaselineMapping): BaselinePreview`.
- `BaselineMapping`: `volumeColumn`, `minutesColumn`, `period` (`annual | monthly | weekly`), and `timeUnit` (`minutes | seconds | hours`).
- `BaselinePreview`: `valid`, row-addressed `errors`, nullable `annualVolume` and `minutesBefore`, `rowCount`, `sourceLocator`, and `assumptionsSummary`.

CSV parsing uses Papa Parse. XLSX parsing lazily imports ExcelJS. Files are limited to 10 MiB, 5,000 data rows, 100 columns and the first 20 selectable sheets. XLSX formulas are rejected with sheet/cell location; CSV spreadsheet-like strings remain inert text. Every mapped row must contain positive finite values. Any bad row makes the whole preview invalid with null totals. Individual and converted numeric values, plus annualized totals, are capped at 1,000,000,000,000. Locators name the selected columns and exact original CSV rows or XLSX cells, including gaps caused by skipped blank rows.

## Test-driven implementation

The initial focused red command was:

```text
node node_modules/vitest/vitest.mjs run src/modules/assessment/repository.test.ts src/modules/assessment/migration.test.ts src/modules/assessment/imports.test.ts
```

All three suites failed to resolve their not-yet-created modules. After the first implementation, repository and migration passed while all 11 import tests failed because `Response(file)` did not preserve browser `File` bytes in the test browser environment. Switching to the browser-native `FileReader` boundary reduced that to three delimiter failures; explicit CSV delimiter parsing produced green. Later focused runs cover actionable unavailable/blocked IndexedDB errors, backup round-trip/limits/version/reference failures, selected migration economics and immutable snapshots, CSV/XLSX equivalence, original row/cell provenance, conversions and annualization, missing/invalid/overflow rows, inert formula text, rejected workbook formulas, file/table/sheet limits and type mismatch.

Final completion evidence:

- `node node_modules/vitest/vitest.mjs run src/modules/assessment/repository.test.ts src/modules/assessment/migration.test.ts src/modules/assessment/imports.test.ts` — **21 tests, 3 files passed**.
- `node node_modules/vitest/vitest.mjs run` — **283 tests, 81 files passed** in 14.00 seconds.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false` — **passed**.
- `node node_modules/eslint/bin/eslint.js src/modules/assessment/repository.ts src/modules/assessment/repository.test.ts src/modules/assessment/migration.ts src/modules/assessment/migration.test.ts src/modules/assessment/imports.ts src/modules/assessment/imports.test.ts --max-warnings=0` — **passed**.
- `node node_modules/prettier/bin/prettier.cjs --check` over the six scoped source/test files and this report — **passed**.
- `git diff --check` — **passed**; its only output was line-ending warnings for the controller's unrelated documentation edits, which remain untouched and are excluded from this commit.

## Browser handoff and remaining verification

No fake IndexedDB dependency is installed, and this task did not add a hidden production test route. Task 3A must exercise native IndexedDB through `/workbench` in a real browser and specifically prove:

- an empty load returns `null`, followed only by explicit UI initialization;
- initial and subsequent revisions round-trip across reloads;
- two repository instances produce a typed stale write and a stale backup restore leaves the previous record unchanged;
- save success is announced only after the transaction commits;
- request/transaction aborts settle pending operations, corrupt records expose `rawBackup`, blocked storage remains non-destructive, and a version change closes the old connection with reconnect guidance.

Task 3A must call `load()` before offering legacy migration, refuse migration when a v2 record already exists, export/preview the old raw `beck-delivery-workbench:v1` value first, save the migrated workspace with `expectedRevision: null`, and never remove or alter the old key. Confirmation only flips the v2 flag. Import preview remains side-effect-free; applying it must be an explicit UI action that creates evidence and assumption revisions.

## Review fix round 1

Fixed sparse XLSX extraction after review of commit `e8440c7`. ExcelJS `actualRowCount` counts populated rows rather than identifying the highest physical row, so a count-based `1..actualRowCount` loop could omit later records after a genuinely absent row. Extraction now uses `worksheet.eachRow({ includeEmpty: false })`, retains each physical `rowNumber`, inspects late formula cells, and applies the 5,000-data-row limit while populated records are extracted.

The regression workbook has populated rows 1, 2 and 4 with row 3 physically absent. Before the fix, three tests failed: row 4 disappeared from the locator, an invalid row 4 incorrectly produced a valid preview of only row 2, and a formula at `Sparse formula!B4` was accepted because it was never visited. After the fix, totals include both data rows (`annualVolume: 40`, weighted `minutesBefore: 3.5`), the locator is `Gaps!A2:B2, A4:B4`, invalid row 4 invalidates the full preview, and the late formula is rejected with its exact cell.

Exact focused green command:

```text
node node_modules/vitest/vitest.mjs run src/modules/assessment/imports.test.ts
```

Output:

```text
Test Files  1 passed (1)
     Tests  15 passed (15)
  Duration  1.33s
```
