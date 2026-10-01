# Task 3 — end-to-end consulting workbench UI

Implement the approved five-surface provider-free synthetic assessment workflow at `/workbench`. Use domain services from Task1, persistence/import from Task2. No duplicate finance engine, fake provider, arbitrary hardcoded outputs or UI controls that do nothing. No subagents. Read local Next docs before route/client code and frontend-design skill. Keep existing Inter/warm executive aesthetic as user requirement overrides generic font advice. Tests first. Worktree path given by controller; old `/demo` stays operational and separate.

## Route boundaries

Add src/app/workbench/page.tsx public client workbench. No login, demo-cookie dependence or server record writes. Add `/workbench` to PUBLIC_PATHS in src/proxy.ts and bypass legacy chrome in src/components/shell/app-shell.tsx for `/workbench`; do not assume a demo bypass already exists. Existing server root provider may still establish old context; no new content transmission. Add a useful link from existing demo to workbench, and a link back. Do not replace existing demo implementation or localStorage key. Capture the route in typed Next build before typecheck if necessary. Scope modules to src/modules/assessment/ui/ plus controller/workbench.tsx. Keep components under ~400 lines by concern, no giant single-file app.

## Overall layout

Route isolation check: root layout currently calls WorkspaceShell → getWorkspaceContext even on public pages. `/workbench` must bypass that server provider lookup as well as legacy client chrome, including when old auth cookies exist. Use a minimal trusted route boundary (for example a proxy-overwritten request surface header read server-side) and test that getWorkspaceContext is not invoked for this public surface. Do not allow an arbitrary client header to change protected-route authorization. Account for cached root layouts when navigating between demo and workbench; full-document links between these separate surfaces are acceptable. Read the relevant installed Next headers/proxy guides before changes.

Warm canvas #f3f2ec, ink #20221e, white work surfaces, cobalt #3157d5, teal value, amber conditions, crimson adverse. Editorial/professional dense workspace, not marketing hero. Main top header: brand, local-only/synthetic indicator, backup/restore and engagement selector; left contextual navigation or tabs with exactly Brief, Evidence, Options & Value, Recommendation, Deliverables; middle active surface; right source/formula/history inspector on >=1280. Inspector as Radix Dialog drawer under1280 with labelled title/close, keyboard focus trap/return. On390 all controls usable, tables scroll within container, no wholepage horizontal overflow. Accessible form labels, statuses, focus indicators, keyboard use, descriptive error messages. Do not use guided tour.

## Persistence/controller

Initial load open IDB repository; if empty show new-workspace screen and offer two synthetic templates plus blank create. Offer explicit legacy migration when oldrecord exists, with backup and preview; never automatic overwrite. On migration success show confirm flag control; preserve old localrecord even afterconfirmation. Opening/error states differentiated. Schema-corrupt/blockedstorage must not silently reset. Saves await transaction, then update localstate and announce Saved. Mutations use latest revision; no stale autosave race. Unsaved form edits kept in draft until Save, prevent abandoning by explicit discard confirmation or preserve draft by key. Multi-tab stale error offers reload persisted record with explicit unsaved-loss warning, never autooverwrite.

Workspace home work queue lists engagements, archived toggle, counts of unknown/conflicted evidence, stale recommendations and deadline. Each issue links to opportunity+section. Create, rename via Brief, duplicate via service, archive and restore via save. Confirm archive if unsaved; no harddelete needed. Create new opportunity under engagement, select independently. Currency in Brief USD/GBP/EUR; changing label does not convert stored numbers and requires acknowledge. Brand name and accent configurable with contrast-safe preset palette only. Only synthetic data warning persistent.

## Brief

Editable name, client, sponsor, process owner, lead, problem, objectives, constraints, dates, decision deadline; required human-readable name. Add opportunity form, independent selection. Discovery categories seven notes editors. Current/future process table add/remove rows (confirm if populated), actor/volume/minutes/exceptions/review, no implicit calculation change from process edits. Save/reload works. Show concise assessment readiness overview and outstanding questions. No datafilled in blankengagement beyond structural defaults.

## Evidence

Source/evidence list left, excerpt+locator/status editor centre; inspector via button right. Add manual evidence and edit; accepted evidence edits create version and return pending unless reviewed again with rationale. Review accept/reject/conflict requires rationale. Status missing for unknown source; show acceptednotproof. Evidence requests editable question,owner,impact,open/closed. Baseline file drop/input CSV/XLSX with sheet selector/mapping/period/timeunit and preview; apply disabled until valid. Applying baseline requires explicit action and updates all options' baseline annualVolume/minutesBefore consistently, adds source evidence pending plus assumption revision; never claims accepted evidence. Source locators, workbook sheet/rows included. File bytes never uploaded. Evidence acceptance alone doesnot update numeric assumptions.

## Options & Value

Option tabs BAU, rules,assistance,automation with independent savedinputs and costlines/benefits. Base inputs editor units/null placeholders; exposure fractions as percent UI convertcorrectly. Numeric edits only save explicitly via service; update assumption revision for changedfield with provenance assumed, owner explicit, confidence userchosen, evidenceIDs selected from realcurrentlist. Evidence link version/conflict status shown. Baseline sharedfield edits warn and apply consistently to everyoption; selected alternative assumptions separate. Assumption inspector editable metadata and history. Cashmechanism required for nonzero cashshare. Costline editor category,name,amount,frequency,start/end,accounting; humanreview doublecount issues exposed. Benefit editor quality/revenue margin,amount,pool,cashshare,mechanism,enabled,overlap resolution meaningful allocation+explanation.

Metrics and charts economicvs cash (Recharts monthly curves), hours/FTE/investment/OPEX/ROI/payback; nullresults display Not assessed, never0. Compare all options sideby-side using engine. Formula explanations and conventions available inspector; thresholds and feasibility/adoption/controlreadiness editable separatefromeconomics. All blockers link to fields/evidence.

Scenarios: base, conservative,upside and save custom inputpatch/costmultiplier/benefitmultiplier; run readonlycomparison, savecustomperoption. Never overwrite base by selecting scenario. Sensitivity +breakeven surfaces fromengine. Simulation in dedicated WebWorker10000 with adjustable ranges/seed; status, cancel/terminate, safefailure, persist summaryseed/ranges/modelversion/optionrevision. On inputchanges mark summary stale; never label result valid for newinputs. Worker dispose unmount; changingoption while running doesn't save towrongoption; postmessage transfer clone. Avoid blockingmainthread. Show triangular independent assumptions limitation. Persist versionthroughappservices.

## Recommendation

Expose the explicit opportunity `risk` readiness (`unknown`, `ready`, `concern`) independently from the critical-control checkbox. A clear checkbox alone is not completed risk assessment. Explain that owned assumptions permit modelling but accepted support is required for material inputs before an investment-ready designation.

Readiness five dimensions: unknown/adverse/ready distinct, all reasons actionable. Composer outcome,rationale,conditions,alternativesrejected,nextdate,strategicexception requiredwhenappropriate. Domain enforces investment blockers not justdisableUI. Captures immutable snapshot via domain. Timeline read-only snapshots and stale marker. Cannot UI-edit old recommendations. Validation handover editable hypotheses,baseline,thresholds,method,owner,budget,controls,stopcriteria. Advisorynotapproval label. NIST-inspired prompts notcertification.

## Deliverables

Wire Task4 export API onceavailable (coordinate). Preview the exact selected reviewed snapshot or current draft explicitlylabelled; oldsnapshot exports must not blend currentcontent. Internalnotes exclude default, checkbox optin. Editable8slide PPTX, Markdownbrief, XLSX reviewworkbook download fromsamepayload; snapshots schema currency/date/brand/synthetic labels. All errors surfaced. Until exporterexists create typed propboundary rather than inert buttons; controllerdispatchTask4 will complete beforeacceptance.

## Acceptance

Focused React tests on nullforms, engagement selection, no tour, edits survive option switch (via real service and covering browserpersistence), review noimplicitinputchange. Browser tests newly added tests/e2e/assessment.spec.ts: blankengagement/createopportunity→baselineimport→options independently saved→review→recommendationsnapshot→reload; templates2→switchcurrency→archive/restore→backup/restore; second tabstale save; malformedbackup/storage denial; no externallysent enteredcontent. NativeIDB tested via UI notmock. Axe sixscreens? five here at1440/1024/390. Full legacy15tests unchanged except usefullink assertions. No downloaded files permanentlystoredoutside testresults.

Write docs/assessment-task-3-report.md, focusedtestsresults and unfinishedfeatures. Commit onlyscope. This is a large task: ask controller to split if implementation cannot fit, do not secretly omit required controls.
