// @vitest-environment node
import { expect, it } from "vitest";
import ExcelJS from "exceljs";
import { createTemplate } from "./templates";
import { createPilotDraft, savePilotRevision } from "./pilot";
import { recordRecommendation } from "./model";
import {
  prepareExport,
  investmentBrief,
  createAssessmentWorkbook,
} from "./exports";

it("projects reviewed pilot facts into partner brief and workbook from the historical snapshot only", async () => {
  const e = createTemplate("support");
  const o = e.opportunities[0];
  e.opportunities[0] = savePilotRevision(o, createPilotDraft(e, o, "target"));
  const saved = recordRecommendation(e, o.id, {
    outcome: "Validate through pilot",
    rationale: "Conditional AI case",
    conditions: "Resolve the measured review effort",
    alternativesRejected: "Rules reduce less work",
    nextDecisionDate: "2026-12-01",
    strategicException: "",
  });
  const s = saved.opportunities[0].recommendations[0];
  saved.opportunities[0].pilots![0].name = "LIVE CANARY SHOULD NOT EXPORT";
  saved.opportunities[0].evidence[0].internalNote = "PRIVATE CANARY";
  const p = prepareExport(
    saved,
    o.id,
    { name: "Beck", accent: "#2358d5" },
    { snapshotId: s.id },
  );
  const text = investmentBrief(p);
  expect(text).toContain("Partner decision brief");
  expect(text).toContain("Synthetic target performance");
  expect(text).toContain("pilot-informed");
  expect(text).not.toContain("LIVE CANARY");
  expect(text).not.toContain("PRIVATE CANARY");
  const blob = await createAssessmentWorkbook(p);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await blob.arrayBuffer());
  expect(wb.getWorksheet("Pilot observations")).toBeDefined();
  expect(wb.getWorksheet("Pilot assessment")).toBeDefined();
});
it("keeps captured pilot currency and costing inputs when the engagement changes currency or rate", async () => {
  const e = createTemplate("support"),
    o = e.opportunities[0];
  e.opportunities[0] = savePilotRevision(o, createPilotDraft(e, o, "target"));
  e.currency = "GBP";
  e.opportunities[0].options.forEach((x) => (x.inputs.hourlyCost = 99));
  const p = prepareExport(e, o.id, { name: "Beck", accent: "#2358d5" });
  expect(p.pilots[0].currency).toBe("USD");
  expect(p.pilots[0].hourlyCost).toBe(38);
  expect(investmentBrief(p).replace(/\s/g, " ")).toContain("USD 170,410.36");
  expect(investmentBrief(p).replace(/\s/g, " ")).not.toContain(
    "GBP 170,410.36",
  );
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await (await createAssessmentWorkbook(p)).arrayBuffer());
  const sheet = wb.getWorksheet("Pilot assessment")!;
  const rows: unknown[][] = [];
  sheet.eachRow((r) => rows.push(r.values as unknown[]));
  expect(rows[0]).toContain("Unit / currency");
  expect(rows.flat()).toContain(e.opportunities[0].pilots![0].id);
  expect(
    rows.some(
      (r) =>
        r.includes("Captured hourly cost") &&
        r.includes(38) &&
        r.includes("USD/hour"),
    ),
  ).toBe(true);
});
