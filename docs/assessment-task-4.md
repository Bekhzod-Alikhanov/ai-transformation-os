# Task 4 — consistent deliverables and release verification

Implement `src/modules/assessment/exports.ts` and tests consuming types/economics/policy, then wire Deliverables UI ifTask3notyetwired. No subagents; no change to the old demo exports. Provider-free local browser exports, all synthetic. Dynamic import pptxgenjs and exceljs alreadyinstalled, no new runtime dependencies.

## Single export payload

Export `prepareExport(engagement,opportunityId,brand,options):ExportPayload`. options snapshotId?:string,includeInternalNotes?:boolean defaultsfalse. Current draft explicitlabel Draft/notreviewed; snapshot selection clones exact persisted recommendation snapshot, not mix oldrationale with currentinputs/evidence. If staleshow snapshotdate/revision separatecurrentrevision. Payload contains branded title, syntheticnotice, client/currency/version/asof, selectedoption, scenario basis, readiness/outcome/reasons, validationplan, flattened evidence+assumptions, independentlycalculatedoptioncomparisons/costbenefits/monthly schedules, source method limitations. Excludedinternalnotes must not appear anywhere including JSON hiddeninsideXLSX/PPTX metadata. Default export excludes `internalNote` from all nestedobjects; never genericstringifyrawrecords. No formulas evaluated from arbitrary input strings; render Excel cells as text and formula-injection-lookingCSV/inputs safely. Preserve unknownnull as Not assessed, zero aszero, no currency hardcodedAster/USD/Beck except defaultbrandingname.

## Exports

- `investmentBrief(payload):string` returns clean Markdown concise executive recommendation, explicit draft/reviewed status, alternatives, evidencegaps, economics, validationhandover and caveats.
- `createSteeringPack(payload):Promise<Blob>` produces exactlyeight editable text/table/chart slides:1Decisionrequested/clientobjective;2Baseline+evidence;3Alternatives;4Valuebridge+36month economics;5Assumptions+sensitivity+unknowns;6Risks+readiness;7Validationplan;8Recommendation+conditions+nextdate. Warm executivecolors, wide16:9, title24–32/body14–18, no screenshot slides. Boundedvisibletext with honest appendixreference toworkbook when recordsdon'tfit; no silentstoringmoredata offslide. Long arbitrarytitle/source text must wrap/limit withoutoverlap; nofakeclientlogo. Disclosurefooteronallslides. Add sources/revision/asof provenance readable.
- `createAssessmentWorkbook(payload):Promise<Blob>` produces reviewworkbook worksheets Overview,Options,Assumptions,Evidence,Costs,Benefits,Monthly flows,Validation,Methods. Propercolumnwidths/frozenheaders/filters whereappropriate, numberformatsfromcurrency. Displaycomputedvalues,notanotherfinancialengine. Include formula definitions/methods inMethods. Structuredcellvalues notcontatenatedCSV. Unknown distinctfrom0. Workbook roundtriptestusingExcelJS validatescellvalueparitywithdomaincalculations. No externalreferences/macros/formulas.
- `downloadArtifact` viaBlobURL/revoke, browseronly.

UI preview must use preparedpayload: selectable Current draft vs priorreviewedsnapshot; notesexclusion toggledefaultfalse; showsectionoutline andactualbriefpreview; downloadMD/PPTX/XLSX controlsdisabledwhilerunninganderrorsactionable. Export of incomplete case allowed only draftlabelwithunknowns; notblockusefuldataextraction.

## Verification and docs

Unit tests all3outputs snapshotconsistency, datacurrency,nofakedidentity, notesexcludedbydefaultandoptinonly, unknown0distinction,8slidecount byunzipping? use existingtransitiveziputilsor deckobjecttesting withreal output supported. Long content tests geometry ifextractable. XLSX sheets/numericalcells usingrealreader. Browserdownloadfilenamesplus meaningfulpayload test; fulltestsassureimportsnotnetworkuploads. Do not claimvisualPPTXcertificationwithoutactualrender/viewtoolavailable.

Update README and docs/architecture.md documenting publicdemo separateworkbench, browserlocal/synthetic, storagebackupmigrations, workingfeatures and remaininglimits. Record usabilitytestprotocol for3–5humanpractitioners but do not claimrecruitedorvalidatedusers. No contacting people withoutsuppliedrecipients andauthorization. Deploy only afterfullverify andcontrollerfinalreview; agent must not push/merge/deploy itself.

Report docs/assessment-task-4-report.md with testedfeaturesandgaps, commit scope.

The controller has prepared `assessment-practitioner-validation.md`. Keep that protocol aligned with the delivered UI, link it from the release documentation, and leave its status as not conducted unless actual authorised sessions supply evidence. Do not create a second competing protocol.
