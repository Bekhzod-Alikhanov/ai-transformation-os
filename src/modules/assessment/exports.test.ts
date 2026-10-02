// @vitest-environment node
import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { createRequire } from "node:module";
import { createTemplate as template } from "./templates";
const createTemplate = (kind: "support" | "reporting") =>
  template(kind, "legacy_aggregate");
import {
  createEngagement,
  createOpportunity,
  recordRecommendation,
} from "./model";
import { calculateOption } from "./economics";
import {
  prepareExport,
  investmentBrief,
  createAssessmentWorkbook,
  createSteeringPack,
} from "./exports";

const require = createRequire(import.meta.url);
const JSZip = require(
  require.resolve("jszip", { paths: [require.resolve("exceljs")] }),
);
const brand = { name: "Synthetic Studio", accent: "#8b513b" };
function fixture() {
  let e = createTemplate("reporting");
  e.client = "Fictional Meridian";
  e.currency = "EUR";
  e.opportunities[0].evidence[0].internalNote = "PRIVATESENTINEL";
  e = recordRecommendation(e, e.opportunities[0].id, {
    outcome: "Investigate",
    rationale: "Historical rationale",
    conditions: "Historical conditions",
    alternativesRejected: "Review the rules alternative",
    nextDecisionDate: "2026-12-01",
    strategicException: "",
  });
  return e;
}
async function zipText(blob: Blob) {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const names = Object.keys(zip.files) as string[];
  const xml = await Promise.all(
    names
      .filter((n) => n.endsWith(".xml"))
      .map((n) => zip.file(n).async("string")),
  );
  return { names, xml: xml.join("\n"), zip };
}
describe("assessment deliverables", () => {
  it("roundtrips the validation budget currency after all preceding fields add continuation rows", async () => {
    const e = fixture(),
      o = e.opportunities[0];
    const fields = [
      "hypotheses",
      "baseline",
      "thresholds",
      "method",
      "owner",
    ] as const;
    for (const field of fields)
      o.validation[field] = `${field}:` + "x".repeat(31000);
    o.validation.budgetCeiling = 12345.67;
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(
      await (
        await createAssessmentWorkbook(prepareExport(e, o.id, brand))
      ).arrayBuffer(),
    );
    const sheet = book.getWorksheet("Validation")!;
    expect(sheet.getCell("A12").value).toBe("budgetCeiling");
    expect(sheet.getCell("B12").value).toBe(12345.67);
    expect(sheet.getCell("B12").numFmt).toContain('"EUR"');
    for (let i = 0; i < fields.length; i++)
      expect(
        String(sheet.getCell(`B${2 + i * 2}`).value) +
          String(sheet.getCell(`B${3 + i * 2}`).value),
      ).toBe(o.validation[fields[i]]);
  });

  it("renders the selected supported accent in real artifacts while retaining snapshot facts and chart semantics", async () => {
    const e = fixture(),
      o = e.opportunities[0],
      snapshot = o.recommendations[0];
    e.client = "CURRENT_CLIENT";
    e.currency = "GBP";
    o.options[2].inputs.adoption = 0;
    const p = prepareExport(
      e,
      o.id,
      { name: "Current rendering studio", accent: "#9f2942" },
      { snapshotId: snapshot.id },
    );
    const artifact = await createAssessmentWorkbook(p);
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(await artifact.arrayBuffer());
    for (const sheet of book.worksheets) {
      expect(sheet.getCell("A1").fill).toMatchObject({
        fgColor: { argb: "FF9F2942" },
      });
      expect(sheet.getCell("A1").font.color).toEqual({ argb: "FFFFFFFF" });
    }
    expect(book.getWorksheet("Options")!.getCell("A2").font.color).toEqual({
      argb: "FF20221E",
    });
    expect(book.getWorksheet("Options")!.getCell("O4").value).toBe(71207.04);
    expect(book.getWorksheet("Options")!.getCell("O4").numFmt).toContain("EUR");
    const { zip, xml } = await zipText(await createSteeringPack(p));
    for (let n = 1; n <= 8; n++)
      expect(
        await zip.file(`ppt/slides/slide${n}.xml`).async("string"),
      ).toContain('val="9F2942"');
    const chart = await zip.file("ppt/charts/chart1.xml").async("string");
    expect(chart).toContain('val="414C3C"');
    expect(chart).toContain('val="A96A49"');
    expect(chart).not.toContain('val="9F2942"');
    expect(xml).toContain("Current rendering studio");
    expect(xml).toContain("Historical rationale");
    expect(xml).not.toMatch(/CURRENT_CLIENT|GBP/);
  });

  it.each(["#ffffff", "#000000", "url(invalid)"])(
    "uses the approved fallback instead of restored raw artifact accent %s",
    async (accent) => {
      const e = fixture();
      const p = prepareExport(e, e.opportunities[0].id, { ...brand, accent });
      const book = new ExcelJS.Workbook();
      await book.xlsx.load(
        await (await createAssessmentWorkbook(p)).arrayBuffer(),
      );
      expect(book.getWorksheet("Overview")!.getCell("A1").fill).toMatchObject({
        fgColor: { argb: "FF3157D5" },
      });
      expect((await zipText(await createSteeringPack(p))).xml).toContain(
        'val="3157D5"',
      );
    },
  );
  it("labels incomplete economics without erasing the reviewed recommendation", async () => {
    const e = createEngagement("Incomplete", "GBP");
    e.opportunities.push(createOpportunity("Unknown case"));
    const reviewed = recordRecommendation(e, e.opportunities[0].id, {
      outcome: "Investigate",
      rationale: "Review the missing baseline",
      conditions: "Collect evidence",
      alternativesRejected: "Not yet assessed",
      nextDecisionDate: "2026-12-01",
      strategicException: "",
    });
    const o = reviewed.opportunities[0];
    const p = prepareExport(reviewed, o.id, brand, {
      snapshotId: o.recommendations[0].id,
    });
    for (const text of [
      investmentBrief(p),
      (await zipText(await createAssessmentWorkbook(p))).xml,
      (await zipText(await createSteeringPack(p))).xml,
    ]) {
      expect(text).toContain("draft economics");
      expect(text).toContain("Review the missing baseline");
      expect(text).toContain("Not assessed");
    }
  });
  it("describes first-year ROI, sustained monthly payback and year-one OPEX accurately", () => {
    const e = fixture(),
      p = prepareExport(e, e.opportunities[0].id, brand);
    const definitions = p.methods.map((m) => m.definition).join(" ");
    expect(definitions).toContain("First-year ROI");
    expect(definitions).toContain("sustained");
    expect(definitions).not.toMatch(
      /interpolated|36-month ROI|steady-state recurring incremental cost/,
    );
    expect(investmentBrief(p)).toContain("ROI (year 1)");
    expect(investmentBrief(p)).toContain("OPEX (year 1)");
    expect(investmentBrief(p)).toContain(
      "| --- | --- | --- | --- | --- |\n| Business as usual",
    );
  });
  it("projects only explicit fields, excluding nested notes and legacy unknown records", async () => {
    const e = fixture(),
      o = e.opportunities[0];
    o.legacyDecisions = [{ internalNote: "LEGACY_SECRET" }];
    const p = prepareExport(e, o.id, brand);
    expect(JSON.stringify(p)).not.toMatch(
      /PRIVATESENTINEL|LEGACY_SECRET|internalNote/,
    );
    for (const text of [
      investmentBrief(p),
      (await zipText(await createAssessmentWorkbook(p))).xml,
      (await zipText(await createSteeringPack(p))).xml,
    ]) {
      expect(text).not.toMatch(/PRIVATESENTINEL|LEGACY_SECRET|Aster|USD|Beck/);
      expect(text).toContain("EUR");
      expect(text).toContain("Fictional Meridian");
      expect(text).toContain("Draft / not reviewed");
    }
    const included = prepareExport(e, o.id, brand, {
      includeInternalNotes: true,
    });
    expect(investmentBrief(included)).toContain("PRIVATESENTINEL");
    expect(
      (await zipText(await createAssessmentWorkbook(included))).xml,
    ).toContain("PRIVATESENTINEL");
    expect((await zipText(await createSteeringPack(included))).xml).toContain(
      "PRIVATESENTINEL",
    );
  });
  it("keeps snapshot facts, sources and economics separate from changed current data", async () => {
    const e = fixture(),
      o = e.opportunities[0],
      snapshot = o.recommendations[0];
    const original = prepareExport(e, o.id, brand, { snapshotId: snapshot.id });
    o.revision++;
    e.currency = "GBP";
    e.client = "CURRENT_CLIENT";
    o.validation.owner = "CURRENT_OWNER";
    o.evidence[0].excerpt = "CURRENT_EVIDENCE";
    o.options[2].inputs.adoption = 0;
    const p = prepareExport(e, o.id, brand, { snapshotId: snapshot.id });
    expect(p.options).toEqual(original.options);
    expect(p.evidence).toEqual(original.evidence);
    expect(p.validation).toEqual(original.validation);
    expect(p.currency).toBe("EUR");
    expect(p.stale).toBe(true);
    for (const text of [
      investmentBrief(p),
      (await zipText(await createAssessmentWorkbook(p))).xml,
      (await zipText(await createSteeringPack(p))).xml,
    ]) {
      expect(text).not.toMatch(
        /CURRENT_CLIENT|CURRENT_OWNER|CURRENT_EVIDENCE|GBP/,
      );
      expect(text).toContain("Historical rationale");
      expect(text).toContain("Reviewed snapshot");
    }
    expect(() =>
      prepareExport(e, o.id, brand, { snapshotId: "missing" }),
    ).toThrow(/snapshot/i);
  });
  it("roundtrips every comparison and monthly flow as values, preserves text and null vs zero", async () => {
    const e = fixture(),
      o = e.opportunities[0];
    o.evidence[0].title = '=HYPERLINK("https://invalid.test","click")';
    const p = prepareExport(e, o.id, brand);
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(
      await (await createAssessmentWorkbook(p)).arrayBuffer(),
    );
    expect(book.worksheets.map((s) => s.name)).toEqual([
      "Overview",
      "Options",
      "Assumptions",
      "Evidence",
      "Costs",
      "Benefits",
      "Monthly flows",
      "Validation",
      "Methods",
    ]);
    const table = book.getWorksheet("Options")!;
    const headers = table.getRow(1).values as string[];
    for (let n = 0; n < o.options.length; n++) {
      const result = calculateOption(o.options[n], o.options[0]);
      expect(
        table.getRow(n + 2).getCell(headers.indexOf("Economic NPV")).value,
      ).toBe(result.npv);
      expect(
        table.getRow(n + 2).getCell(headers.indexOf("Cash NPV")).value,
      ).toBe(result.cashNpv);
      result.monthly.forEach((m, index) => {
        const row = book
          .getWorksheet("Monthly flows")!
          .getRow(n * 37 + index + 2);
        expect((row.values as unknown[]).slice(3)).toEqual([
          m.month,
          m.economicBenefit,
          m.cashBenefit,
          m.cost,
          m.economicNet,
          m.cashNet,
          m.cumulative,
          m.cashCumulative,
        ]);
      });
    }
    expect(book.getWorksheet("Monthly flows")!.rowCount).toBe(1 + 37 * 4);
    expect(book.getWorksheet("Evidence")!.getCell("B2").value).toBe(
      o.evidence[0].title,
    );
    for (const sheet of book.worksheets)
      sheet.eachRow((row) =>
        row.eachCell((cell) =>
          expect(cell.type).not.toBe(ExcelJS.ValueType.Formula),
        ),
      );
    const blank = createEngagement("Blank", "GBP");
    blank.opportunities.push(createOpportunity("Unknown"));
    blank.opportunities[0].options[0].inputs.annualVolume = 0;
    const bp = prepareExport(blank, blank.opportunities[0].id, brand);
    expect(
      bp.options[0].inputs.find((i) => i.field === "annualVolume")?.value,
    ).toBe(0);
    expect(
      bp.options[0].inputs.find((i) => i.field === "adoption")?.value,
    ).toBeNull();
    expect(investmentBrief(bp)).toContain("Not assessed");
    const blankBook = new ExcelJS.Workbook();
    await blankBook.xlsx.load(
      await (await createAssessmentWorkbook(bp)).arrayBuffer(),
    );
    expect(blankBook.getWorksheet("Assumptions")!.getCell("D2").value).toBe(0);
    expect(blankBook.getWorksheet("Assumptions")!.getCell("D6").value).toBe(
      "Not assessed",
    );
    expect(blankBook.getWorksheet("Options")!.getCell("O2").value).toBe(
      "Not assessed",
    );
  });
  it("preserves long source text in visible workbook rows without exposing it in metadata", async () => {
    const e = fixture(),
      o = e.opportunities[0];
    const full = "Source text ".repeat(4000) + "ENDMARKER";
    o.evidence[0].source = full;
    e.objectives = full;
    const book = new ExcelJS.Workbook();
    const artifact = await createAssessmentWorkbook(
      prepareExport(e, o.id, brand),
    );
    await book.xlsx.load(await artifact.arrayBuffer());
    const sheet = book.getWorksheet("Evidence")!;
    expect(
      String(sheet.getCell("D2").value) + String(sheet.getCell("D3").value),
    ).toBe(full);
    expect(sheet.state).toBe("visible");
    let budgetFormat = "";
    book.getWorksheet("Overview")!.eachRow((row) => {
      if (row.getCell(1).value === "Budget ceiling")
        budgetFormat = row.getCell(2).numFmt;
    });
    expect(budgetFormat).toContain("EUR");
    const archive = await zipText(artifact);
    expect(archive.names.some((n) => /externalLinks|vbaProject/i.test(n))).toBe(
      false,
    );
    expect(archive.xml).not.toContain("PRIVATESENTINEL");
  });
  it("writes exactly eight editable bounded slides with workbook references for long content", async () => {
    const e = fixture(),
      o = e.opportunities[0];
    e.objectives = "Long objective ".repeat(500);
    o.evidence[0].source = "Long source ".repeat(600);
    const { names, xml, zip } = await zipText(
      await createSteeringPack(prepareExport(e, o.id, brand)),
    );
    const slides = names.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
    expect(slides).toHaveLength(8);
    expect(names.some((n) => /^ppt\/charts\/chart/.test(n))).toBe(true);
    expect(names.some((n) => /^ppt\/media\/.+/.test(n))).toBe(false);
    expect(xml).toContain("workbook");
    expect(xml.includes("108,892.88")).toBe(true);
    expect(xml.includes("Annual volume")).toBe(true);
    expect(xml.includes("Minutes per item")).toBe(true);
    expect(xml.includes("Hourly cost (EUR)")).toBe(true);
    const baselineAndSensitivity =
      (await zip.file("ppt/slides/slide2.xml").async("string")) +
      (await zip.file("ppt/slides/slide5.xml").async("string"));
    expect(
      /annualVolume|minutesBefore|hourlyCost|costMultiplier/.test(
        baselineAndSensitivity,
      ),
    ).toBe(false);
    for (const name of slides) {
      const text = await zip.file(name).async("string");
      expect(text).toContain("Synthetic");
      expect(text).toContain("as of");
      for (const m of text.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g))
        expect(m[1].length).toBeLessThan(1500);
      for (const m of text.matchAll(
        /<a:xfrm[^>]*><a:off x="(\d+)" y="(\d+)"\/><a:ext cx="(\d+)" cy="(\d+)"\/>/g,
      )) {
        expect(Number(m[1]) + Number(m[3])).toBeLessThanOrEqual(12192000);
        expect(Number(m[2]) + Number(m[4])).toBeLessThanOrEqual(6858000);
      }
    }
  });
});
