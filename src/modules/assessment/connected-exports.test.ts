// @vitest-environment node
import { expect, it } from "vitest";
import ExcelJS from "exceljs";
import { createTemplate } from "./templates";
import { replaySupport } from "./evaluation";
import { recordRecommendation } from "./model";
import {
  prepareExport,
  investmentBrief,
  createAssessmentWorkbook,
} from "./exports";
it("exports task and evaluation facts from the reviewed snapshot, not later edits", async () => {
  let e = createTemplate("support"),
    o = e.opportunities[0];
  o.evaluations = [replaySupport(o.selectedOptionId, o.revision)];
  o.evidence[0].internalNote = "INTERNAL_ONLY";
  e = recordRecommendation(e, o.id, {
    outcome: "Validate through pilot",
    rationale: "Validate adoption and review time",
    conditions: "Human approval",
    alternativesRejected: "Rules release less capacity at base",
    nextDecisionDate: "2026-12-01",
    strategicException: "",
  });
  o = e.opportunities[0];
  const snapshot = o.recommendations[0];
  o.options[2].taskPlan!.rows[1].reviewMinutes = 99;
  const p = prepareExport(
    e,
    o.id,
    { name: "Beck", accent: "#3157d5" },
    { snapshotId: snapshot.id },
  );
  const brief = investmentBrief(p);
  expect(
    p.tasks.find((t) => t.optionName === "Human-reviewed AI")
      ?.referenceReduction,
  ).toBe(0.5);
  expect(brief).toContain("Policy check blocked unsupported refund promise");
  expect(brief).not.toContain("INTERNAL_ONLY");
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(await (await createAssessmentWorkbook(p)).arrayBuffer());
  const tasks = book.getWorksheet("Task model")!;
  expect(tasks).toBeDefined();
  const cells: unknown[] = [];
  tasks.eachRow((r) => {
    cells.push(...(r.values as unknown[]));
  });
  expect(cells).toContain(0.8);
  expect(cells).not.toContain(99);
  expect(book.getWorksheet("Evaluation")).toBeDefined();
});
