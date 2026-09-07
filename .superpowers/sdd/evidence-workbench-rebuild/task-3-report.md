# Task 3 — Evidence workbench report

## Takeover handling

The inherited `src/components/shell/app-shell.tsx` type patch had no RED evidence. I removed it with `apply_patch`, reproduced the generated typed-route failure with `corepack pnpm build` (`app-shell.tsx:348`, `string` not assignable to Next `Route`), then reintroduced a narrow navigation-route type and watched the same production build pass.

## Summary

- Added tenant-bound candidate review service/repository/API. A review is an atomic service-role RPC that locks a pending candidate, writes immutable `ai_inferred` evidence on acceptance, and for edits writes immutable `user_provided` evidence linked through `parent_evidence_id`. Rejections remain immutable review records; stale re-reviews fail.
- Added conflict derivation/eligibility utilities. Contradictory accepted values are grouped by `claim_key`, retain locator/excerpt comparisons, and are excluded from decision/economic eligibility until a selected evidence resolution exists.
- Added migration `202608290002_evidence_workbench.sql`: immutable conflict resolutions, tenant-bound review, draft creation and optimistic terminal draft transition RPCs, immutable/idempotent agent run-event writes, Realtime publication for `agent_events`, parent-evidence lineage, and approval assignment indexing.
- Added `/evidence`, a responsive editorial three-pane desk. Selecting the source queue visibly traces to a highlighted source locator and provenance/review inspector. Accept/reject/edit controls post persisted reviews and have accessible labels/status feedback.
- Changed authenticated live Home to persistent organisation-scoped **My Work** queues for source/candidate reviews, drafts, failed runs, decisions due, and approvals assigned to the current actor. Live loader/UI paths contain no Aster fixture imports.

## Visual rationale

The workbench uses the existing warm off-white shell, paper source canvas, ink typography, cobalt actions, teal evidence values, amber conflicts, and crimson rejection. Dense ruled panes put source fidelity ahead of generic-card dashboards; the highlighted locator and trace line make queue-to-provenance navigation explicit.

## Docs and APIs inspected

- Task 3 brief and Task 2 report/contracts/repositories.
- Next 16 installed docs: server/client components, fetching data, route handlers, mutating data, data security, authentication, linking/navigation, and typed routes.
- Installed `@supabase/supabase-js` / SSR client surface and existing project Supabase service/repository patterns.

## Files changed

- Data/schema: `supabase/migrations/202608290002_evidence_workbench.sql`, `src/lib/supabase/database.types.ts`.
- Review/conflicts/API: `src/modules/evidence-review/*`, `src/app/api/evidence/candidates/[candidateId]/review/route.ts`.
- UI/routes: `src/app/evidence/page.tsx`, `src/components/shell/app-shell.tsx`, `src/app/page.tsx`, `src/modules/dashboard/my-work-queues*`.
- Tests: evidence review service/conflicts/Supabase adapter/API/migration/workbench and My Work/home tests.

## RED → GREEN evidence

1. `corepack pnpm build` RED: original generated typed-route error at `app-shell.tsx:348`; GREEN: production build passed after the typed navigation correction.
2. `corepack pnpm test:unit src/modules/evidence-review/evidence-review-service.test.ts` RED: missing service module; GREEN: 3 acceptance/edit/rejection semantics tests passed.
3. `... evidence-conflicts.test.ts` RED: missing module; GREEN: 2 conflict exclusion/resolution tests passed.
4. `... supabase-evidence-review-repository.test.ts` RED: missing module; GREEN: org-bound candidate/RPC contract passed.
5. `... evidence-review-migration.test.ts` RED: missing migration; GREEN: 2 migration contract checks passed.
6. `... evidence-workbench.test.tsx` RED: missing component; GREEN: accessible three-pane trace and persisted rejection control tests passed.
7. `... evidence-review-api.test.ts` RED: missing API handler; GREEN: authenticated validation/persistence boundary tests passed.
8. `... my-work-queues.test.tsx` RED: missing component; GREEN: visible, navigable queue tests passed.

## Final verification

- Focused suite: 8 files / 15 tests passed.
- Full unit: `corepack pnpm test:unit` — 58 files / 140 tests passed.
- `corepack pnpm typecheck` — passed.
- `corepack pnpm lint` — passed with zero warnings.
- `corepack pnpm secret:scan` — passed.
- `corepack pnpm build` — passed, including `/evidence` and review API typed routes.
- Targeted changed-file Prettier check and `git diff --check` — passed.
- Static tenant scan found every Task 3 Supabase query/RPC organisation-bound; Task 3 live paths had no Aster fixture strings. Control scan verified all evidence desk buttons use real POST persistence or stateful queue selection.

## Risks / unavailable validation

- `supabase` CLI and Docker are unavailable, so migration application, pgTAP, database triggers/RLS, and actual Realtime channel delivery could not be executed locally. The migration and repository/API contracts are unit-tested, but must be run against local Supabase before release.
- Browser screenshot QA was not run: the isolated workspace has no configured live Supabase/auth runtime and no browser session suited to authenticated evidence data. Component accessibility tests cover semantic regions, focusable actions, status feedback, and trace navigation.
- Realtime persistence/publication is included in the migration; the current desk consumes reload-safe server data and does not yet mount a browser Realtime subscription/recovery hook. This is the remaining implementation gap before calling the full brief complete.

## Commit

Committed as `feat: add evidence review workbench`.

## Realtime completion

### Docs and implementation

- Re-read installed Next 16 Server/Client Component and data-fetching guidance; the subscribed surface is a narrow Client Component mounted inside the server-loaded evidence desk.
- Inspected installed Supabase Browser Client/Realtime channel APIs and used `channel(...).on('postgres_changes', ...).subscribe(...)` with `removeChannel(...)` cleanup.
- Added the actor-bound persisted-events endpoint at `/api/evidence/runs/[runId]/events`. It queries the service client only on the server with both `organisation_id` and `run_id` predicates, then filters returned DTOs again before responding. No service credential crosses the client boundary.
- `RunEventController` treats channel payloads as a wake-up signal only; content is rendered only after recovery fetches the authoritative persisted endpoint. It filters all returned rows by organisation/run, reconnects after errors, performs immediate recovery, bounds fallback polling/reconnect timers, prevents duplicate subscriptions, ignores stale results, and disposes all resources.
- `RunEventFeed` mounts that controller for an active persisted run and exposes compact `role=status` text for connected/recovering/degraded/updated activity.

### RED → GREEN evidence

1. `corepack pnpm test:unit src/modules/evidence-review/run-event-controller.test.ts` RED: controller module was absent; GREEN: 4 tests passed for organisation/run filtering, failure recovery and bounded polling, stale-response protection, and timer/subscription cleanup.
2. `corepack pnpm test:unit src/modules/evidence-review/agent-event-api.test.ts` RED: API handler module was absent; GREEN: actor organisation binding and malicious cross-tenant DTO filtering passed.
3. `corepack pnpm test:unit src/modules/evidence-review/run-event-feed.test.tsx` RED: feed module was absent; GREEN: controller mount and accessible recovering state passed.
4. Combined focused Realtime/UI run: 4 files / 8 tests passed.

### Verification and limitation

- Full unit: 61 files / 146 tests passed; typecheck, lint, secret scan, targeted Prettier, diff check, static organisation/Aster scans, and production build all passed.
- The build includes `/api/evidence/runs/[runId]/events` and `/evidence`.
- Supabase CLI/Docker remain unavailable, so an actual Realtime websocket/database integration cannot be exercised locally. The controller/endpoint contract is deterministic and covered in unit tests; live channel delivery still needs environment-backed smoke validation.

### Commit

`9ca5a0a fix: complete evidence run realtime recovery`.

## Review fix round 1

### Findings addressed

1. Replaced the live Opportunity Miner hard-coded source path with organisation-bound, actor-bound draft mining. The miner loads only accepted, conflict-safe evidence through a trusted RPC and persists editable versioned drafts. Draft merge requires an in-org target and links all selected evidence deterministically; reject is persisted; promote creates or selects an in-org use case and links evidence.
2. Added `202608290003_evidence_workbench_hardening.sql`: authenticated direct writes are revoked for authoritative evidence, candidate, review, event, conflict-resolution, draft, and draft-evidence facts. Trusted RPCs now receive the actor ID and revalidate service role, membership, allowed role, and organisation in the database.
3. Reworked conflict eligibility in the database so each selected draft evidence row must have accepted-review provenance and be in-organisation. Any contradictory accepted value for its claim key requires an immutable resolution selecting that exact evidence. The shared `eligible_opportunity_evidence` RPC is the miner input.
4. Added the actor-bound immutable conflict-resolution RPC/API and a live evidence-desk control. The desk loads accepted-evidence conflicts (rather than candidate IDs), presents side-by-side radio choices and a required rationale, persists the selected accepted evidence, removes the resolved row, and refreshes authoritatively. The resolver validates a real contradiction and stored membership; the same database eligibility contract feeds mining.
5. Review API now rejects synthetic actors and viewer/approver roles; `review_evidence_candidate` also checks the server actor against stored membership. The browser cannot supply a trusted reviewer identity.
6. My Work `decisionsDue` now queries organisation-scoped unresolved decisions with `human_decision is null` and `follow_up_at <= now`, independently from approvals assigned to the actor.
7. The evidence inspector now uses installed Radix Dialog below 1025px, including 1024px and 390px layouts: labelled trigger/title, overlay, modal focus handling, Escape close, focus restoration, and no simultaneous desktop inspector.
8. The workbench now separately loads queued, failed, and OCR-required sources even without candidates and exposes a navigation recovery path. Locator resolution now yields exact text-line, PDF-page, DOCX-section, spreadsheet-cell, and CSV-row excerpts.
9. Realtime now filters by organisation and run in the Supabase subscription, treats events as wakeups only, serializes persisted recovery, retries repeated reconnect failures, waits for recovery completion before polling again, rejects stale/cross-tenant rows, and cleans up channels/timers.
10. Candidate controls disable while saving, report actionable failures, remove successfully terminal candidates locally, and trigger an authoritative server refresh.
11. Added CI-runnable pgTAP privilege/RPC coverage plus focused runtime/component/migration tests for membership/direct-write hardening, draft transitions, locator behavior, responsive drawer focus, decision queues, review role denial, and Realtime races.

### Docs and contracts read

- Task 3 brief, prior Task 3 report, Task 3 review findings, and Task 1/2 implementation reports/contracts.
- Installed Next 16 App Router guidance: Server/Client Components, fetching/mutating data, Route Handlers, authentication, data security, and multi-tenant guidance.
- Installed Supabase 2.112.3 client/RPC and Realtime channel types, including organisation/run Postgres filters, subscription status values, and `removeChannel` cleanup.

### Files and surfaces changed

- Schema/tests: `supabase/migrations/202608290003_evidence_workbench_hardening.sql`, `supabase/tests/evidence_workbench.sql`, and migration contract tests.
- Opportunities: draft service, trusted Supabase repository, API handlers/runtime/routes, organisation loader, live draft queue/actions, live opportunities page, and compatibility miner route.
- Evidence: role-gated review repository/API, conflict-resolution API/runtime/route, independent source queue loading, exact locator helper, responsive Radix desk, and Realtime controller/subscription improvements.
- Home: organisation-scoped decisions-due query with separate assigned-approval count.

### RED → GREEN evidence

1. `opportunity-draft-service.test.ts` RED: missing service module; GREEN: conflict-safe mining and merge target/optimistic transition tests passed.
2. `opportunity-draft-api.test.ts` and `supabase-opportunity-draft-repository.test.ts` RED: missing modules; GREEN: synthetic/unauthorised denial and actor/organisation trusted RPC payloads passed.
3. `opportunity-drafts.test.tsx` RED: missing editable operational draft view; GREEN: persisted merge removes terminal draft and reports status.
4. `evidence-workbench-hardening-migration.test.ts` RED: missing migration/pgTAP files; GREEN: direct-write revocation/membership-RPC and CI test contracts passed.
5. `my-work-queues.server.test.ts` RED: due work queried expired approvals; GREEN: decisions and approvals are independently loaded.
6. `run-event-controller.test.ts` RED: repeated degraded reconnect did not reschedule and polling was scheduled while recovery was active; GREEN: deterministic retry/serialization/timer tests passed.
7. `evidence-workbench.test.tsx` RED: no mobile labelled review drawer or persisted conflict choice; GREEN: Radix Dialog, Escape close/focus restoration, and conflict selection/rationale POST passed.
8. `source-locator-excerpt.test.ts` RED: helper missing; GREEN: exact text/PDF/DOCX/spreadsheet/CSV excerpts passed.

### Verification

- Focused final suite: evidence workbench conflict/drawer test passed after an observed RED.
- Full unit suite: 68 files / 161 tests passed.
- `corepack pnpm typecheck` passed.
- `corepack pnpm lint` passed with zero warnings.
- `corepack pnpm build` passed and includes the evidence conflict API and operational opportunity routes.
- Targeted changed-file Prettier check, `git diff --check`, and `corepack pnpm secret:scan` passed. Repository-wide `format:check` remains red on 121 pre-existing files outside this Task 3 change set.
- Static scan confirmed legacy `approved-ledger-batch`/`aster-evidence-ledger` are removed from the live miner path; every new authoritative RPC carries both organisation and actor inputs; direct authenticated write revocations are present.

### Limits and residual validation

- `corepack pnpm test:db` remains unavailable because the Supabase CLI/Docker runtime is not installed locally. The SQL/pgTAP suite is committed for CI, but its privilege/RPC checks and actual RLS, trigger, PL/pgSQL, and Realtime websocket behavior still require environment-backed execution.
- Authenticated browser QA is unavailable in this isolated worktree. Component tests cover mobile drawer/focus/Escape, persisted-action status/terminal removal, and responsive inspector behavior; a signed-in browser smoke test remains required before release.

### Commit

- `e6c24eb fix: harden evidence workbench workflows`.

## Review fix round 2

### Findings addressed

1. Drafts now have an actor-bound, expected-version edit operation. It edits title, problem statement, business unit, and selected evidence only through `edit_opportunity_draft`; prior state is recorded in immutable `opportunity_draft_revisions`, and the server revalidates accepted/resolved evidence before replacing the draft-evidence junction.
2. The follow-on migration drops `evidence_links`' legacy authenticated `tenant_write` policy and revokes authenticated writes. Promotion continues to create links inside the trusted actor-bound RPC.
3. The evidence desk no longer hides accepted-evidence conflicts when candidate review is empty. It keeps the conflict radio choice, rationale, persistence control, and authoritative refresh available independently.
4. The source queue now derives outstanding source work from organisation-scoped `ingestion_runs` joined to sources, preserving queued/parsing/failed/OCR work without candidates. Agent runs remain only for the Realtime feed.
5. `supabase/tests/evidence_workbench.sql` now seeds users, organisations, memberships, source/evidence records, contradictory accepted evidence, and a draft. Its 19 pgTAP assertions exercise direct-link denial, role/cross-org rejection, conflict resolution/immutability, unresolved/resolved draft behavior, stale/edit/revision behavior, promote linkage, and a persisted reload read.

### RED → GREEN evidence

1. `opportunity-draft-service.test.ts`: RED `service.update is not a function`; GREEN versioned conflict-safe edit dispatch passed.
2. `supabase-opportunity-draft-repository.test.ts`: RED `repository.updateDraft is not a function`; GREEN trusted RPC payload, actor, organisation, version, fields, and evidence IDs passed.
3. `opportunity-draft-api.test.ts`: RED `handlers.edit is not a function`; GREEN malformed selected evidence is rejected before persistence.
4. `opportunity-drafts.test.tsx`: RED missing Edit draft control; GREEN editable fields/evidence selection PATCH and authoritative refresh passed.
5. `evidence-workbench.test.tsx`: RED no radio choices when candidates were empty; GREEN accepted conflicts remained persistently actionable.
6. `evidence-workbench-data.test.ts`: RED missing ingestion queue mapper; GREEN parsing ingestion work without candidates was rendered from the source run.
7. `evidence-workbench-hardening-migration.test.ts`: RED after replacing obsolete metadata coverage; GREEN validates the seeded 19-scenario pgTAP contract.

### Verification

- Focused component/service/repository/API/loader/migration tests passed.
- Full unit: `69` files / `167` tests passed.
- `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm build`, and `corepack pnpm secret:scan` passed.
- Targeted Prettier and `git diff --check` passed. Static scans found no legacy Aster ledger/miner identifiers in live Task 3 paths and confirmed the evidence-link revocation/edit RPC policy contract.

### DB runtime limitation

- `corepack pnpm test:db` cannot run in this worktree because the Supabase CLI/Docker runtime is unavailable (`supabase` is not recognized). The seeded pgTAP suite is committed for CI/local Supabase execution; its database behavior is not claimed as locally executed.

### Commit

- `cd34977 fix: complete evidence workbench review round two`.

## Review fix round 3

### Findings addressed

1. Source-queue precedence now makes the persisted source lifecycle authoritative for outstanding work. Sources in `uploading`, `queued`, `parsing`, `requires_ocr`, `review_required`, or `failed` remain visible even when their most recent organisation-scoped `ingestion_runs` row is `completed`. The run contributes progress or failure detail; only a non-actionable source lifecycle such as ready/completed is excluded.
2. Reject is now terminal without a merge target or linkage. The draft UI clears and omits a previously selected merge target before rejecting; the route handler and service reject a supplied target; and `202608300002_opportunity_draft_transition_guard.sql` applies the same restriction in the authoritative actor-bound RPC. Merge still requires an in-organisation target and deterministically links selected eligible evidence.
3. The seeded pgTAP suite now has 26 behavioral assertions, including an in-organisation merge with persisted terminal/linkage results, a reject-with-target denial, a targetless reject with no additional `evidence_links`, stale-version failure, and persisted reload coverage.

### RED → GREEN evidence

1. `evidence-workbench-data.test.ts`: RED returned no queue entries for queued/failed sources with completed ingestion runs; GREEN retains both actionable source states and excludes a ready source with a completed run.
2. `opportunity-drafts.test.tsx`: RED serialized a selected `targetUseCaseId` in a reject request; GREEN clears the selection and sends only `action` plus `expectedVersion`.
3. `opportunity-draft-service.test.ts`: RED allowed reject dispatch with a target; GREEN rejects it before repository persistence.
4. `opportunity-draft-api.test.ts`: RED returned success for a reject request containing a target; GREEN returns a validation failure before persistence.
5. `evidence-workbench-hardening-migration.test.ts`: RED expected the expanded behavioral pgTAP contract while the suite planned 25 assertions; GREEN validates the corrected 26-assertion seeded scenario set.

### Files and database contract changed

- Evidence loader/UI: source status precedence in `evidence-workbench-data.server.ts`, queue-focused loader tests, and the expanded source-status contract in `evidence-workbench.tsx`.
- Opportunities: reject target clearing in the live draft view, request validation in the API/service, and focused UI/API/service regressions.
- Database: `202608300002_opportunity_draft_transition_guard.sql` replaces the trusted transition RPC with actor/membership/organisation checks preserved and explicit reject-target denial before any linkage.
- pgTAP/static contract: seeded merge/reject execution, linkage/no-linkage, stale-version, and reload assertions in `supabase/tests/evidence_workbench.sql` and its executable source-contract test.

### Verification

- Focused final suite: 5 files / 15 tests passed (`evidence-workbench-data`, hardening migration contract, opportunity draft service/API/UI).
- Full unit: 69 files / 171 tests passed.
- `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm build`, and `corepack pnpm secret:scan` passed.
- Targeted Prettier checks and `git diff --check` passed. Static scans found no legacy Aster ledger/miner identifiers in the live Task 3 paths and confirmed reject-target protection plus trusted-RPC-only linkage references.

### DB runtime limitation

- `corepack pnpm test:db` remains unavailable because the local Supabase CLI/Docker runtime is absent (`supabase` is not recognized). The expanded seeded pgTAP suite is committed for CI/environment-backed execution; its PL/pgSQL/RLS behavior is not claimed as locally executed.

### Commit

- `13c7945 fix: harden evidence queue and draft rejection`.
