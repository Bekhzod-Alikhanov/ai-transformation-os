import type PptxGenJS from "pptxgenjs";
import type { ExportPayload } from "./payload";
import { amount, shown, metric } from "./brief";
import { artifactAccent } from "../brand";

export const STEERING_OUTLINE = [
  "Decision requested / client objective",
  "Baseline and evidence",
  "Alternatives",
  "Value bridge and 36-month economics",
  "Assumptions, sensitivity and unknowns",
  "Risks and readiness",
  "Validation plan",
  "Recommendation, conditions and next date",
] as const;

const readable = (field: string) =>
  field
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());

/** Conservative fixed-font line budget. Overflow is visible as a workbook
 * reference; it is never parked outside a shape or hidden in speaker notes. */
function bounded(
  value: string,
  width: number,
  lines: number,
  fontSize: number,
) {
  const chars = Math.max(12, Math.floor((width * 72) / (fontSize * 0.72)));
  const clean = shown(value).replace(/\s+/g, " ");
  const capacity = chars * lines;
  const clipped = clean.length > capacity;
  const source = clipped
    ? `${clean.slice(0, Math.max(0, capacity - 24))}… [full text: workbook]`
    : clean;
  const result: string[] = [];
  let rest = source;
  while (rest.length) {
    let split = Math.min(chars, rest.length);
    if (split < rest.length) {
      const space = rest.lastIndexOf(" ", split);
      if (space > chars * 0.6) split = space;
    }
    result.push(rest.slice(0, split).trim());
    rest = rest.slice(split).trim();
  }
  // Word wrapping can introduce an extra line; disclose that truncation too.
  if (result.length > lines)
    return [...result.slice(0, lines - 1), "… full text: workbook"].join("\n");
  return result.join("\n");
}
export async function createSteeringPack(p: ExportPayload): Promise<Blob> {
  const { default: Pptx } = await import("pptxgenjs");
  const deck = new Pptx();
  deck.layout = "LAYOUT_WIDE";
  deck.author = p.brand.name;
  deck.subject = p.notice;
  deck.title = p.title;
  deck.company = p.brand.name;
  deck.theme = { headFontFace: "Aptos Display", bodyFontFace: "Aptos" };
  const ink = "20221E",
    muted = "5C6258",
    accent = artifactAccent(p.brand.accent),
    cream = "F7F4ED";
  const selected = p.options.find((o) => o.selected)!,
    f = selected.financial;
  const pilot = p.pilots.find((x) => x.id === p.partner.latestPilotId);
  function text(
    slide: PptxGenJS.Slide,
    value: string,
    x: number,
    y: number,
    w: number,
    h: number,
    lines = 6,
    size = 16,
    color = ink,
    bold = false,
  ) {
    slide.addText(bounded(value, w, lines, size), {
      x,
      y,
      w,
      h,
      fontSize: size,
      color,
      bold,
      margin: 0,
      valign: "top",
      breakLine: false,
      paraSpaceAfter: 0,
      lineSpacingMultiple: 1.05,
    });
  }
  function page(index: number, appendix: string) {
    const slide = deck.addSlide();
    slide.background = { color: cream };
    slide.addShape(deck.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 0.16,
      h: 7.5,
      fill: { color: accent },
      line: { color: accent },
    });
    text(
      slide,
      `${p.brand.name} / ${p.client || "Client not assessed"}`,
      0.65,
      0.3,
      12,
      0.38,
      1,
      12,
      muted,
    );
    text(
      slide,
      STEERING_OUTLINE[index],
      0.65,
      0.88,
      12,
      0.82,
      2,
      28,
      ink,
      true,
    );
    text(
      slide,
      `${p.status} · ${p.currency} · source r${p.sourceRevision}`,
      0.65,
      1.78,
      12,
      0.48,
      2,
      12,
      muted,
    );
    text(
      slide,
      `Sources / overflow: workbook — ${appendix}; as of ${p.asOf}. Current r${p.currentRevision}${p.stale ? "; stale historical snapshot" : ""}.`,
      0.65,
      6.54,
      12,
      0.42,
      2,
      10,
      muted,
    );
    text(
      slide,
      `${p.notice}  |  ${index + 1}/8  |  ${p.modelVersion}`,
      0.65,
      7.05,
      12,
      0.3,
      1,
      9,
      muted,
    );
    return slide;
  }
  function card(
    slide: PptxGenJS.Slide,
    label: string,
    value: string,
    x: number,
    y: number,
    w = 5.7,
    h = 1.7,
  ) {
    text(slide, label.toUpperCase(), x, y, w, 0.35, 1, 12, accent, true);
    text(
      slide,
      value,
      x,
      y + 0.4,
      w,
      h - 0.4,
      Math.max(2, Math.floor((h - 0.4) / 0.26)),
      16,
    );
  }
  function table(
    slide: PptxGenJS.Slide,
    headers: string[],
    rows: string[][],
    x: number,
    y: number,
    widths: number[],
    rowH = 0.68,
  ) {
    const data = [headers, ...rows].map((row, rowIndex) =>
      row.map((cell, i) => ({
        text: bounded(cell, widths[i] - 0.18, 2, 14),
        options: {
          bold: rowIndex === 0,
          color: rowIndex === 0 ? "FFFFFF" : ink,
          fill: {
            color: rowIndex === 0 ? accent : rowIndex % 2 ? "EDE8DE" : "FFFFFF",
          },
        },
      })),
    );
    slide.addTable(data, {
      x,
      y,
      w: widths.reduce((a, b) => a + b, 0),
      colW: widths,
      rowH,
      fontFace: "Aptos",
      fontSize: 14,
      margin: 0.08,
      border: { type: "solid", color: cream, pt: 1 },
      valign: "middle",
      autoPage: false,
      verbose: false,
    });
  }
  let s = page(0, "Overview");
  card(s, "Decision requested", `${p.outcome} · ${selected.name}`, 0.65, 2.38);
  card(s, "Client objective", p.objectives, 7, 2.38);
  card(s, "Why this decision", p.rationale, 0.65, 4.38);
  card(s, "Problem and basis", `${p.problem} ${p.basis}`, 7, 4.38);

  s = page(1, "Evidence, Assumptions, Overview");
  const baseline = selected.inputs.filter((i) =>
    ["annualVolume", "minutesBefore", "hourlyCost"].includes(i.field),
  );
  table(
    s,
    ["Baseline", "Saved value"],
    baseline.map((i) => [
      i.field === "annualVolume"
        ? "Annual volume (items)"
        : i.field === "minutesBefore"
          ? "Minutes per item"
          : `Hourly cost (${p.currency})`,
      shown(i.value),
    ]),
    0.65,
    2.38,
    [3, 2.7],
  );
  card(
    s,
    "Source coverage",
    `${p.evidence.filter((e) => e.status === "accepted").length} accepted of ${p.evidence.length} sources. Acceptance is a recorded review, not independent verification.`,
    0.65,
    5.2,
    5.7,
    1.15,
  );
  if (!p.evidence.length)
    card(
      s,
      "Evidence",
      "Not assessed. See open requests in the workbook.",
      7,
      2.38,
    );
  p.evidence
    .slice(0, 2)
    .forEach((e, i) =>
      card(
        s,
        `Source ${i + 1} · ${e.status} · v${e.version}`,
        `${e.title}. ${e.excerpt} Source: ${e.source}; ${e.locator}; ${shown(e.date)}.${p.includeInternalNotes && e.internalNote ? ` Internal note: ${e.internalNote}` : ""}`,
        7,
        2.38 + i * 1.95,
        5.7,
        1.8,
      ),
    );
  // Notes are explicit and opt-in; long or additional notes are in the workbook.
  if (p.includeInternalNotes && p.evidence.some((e) => e.internalNote))
    text(
      s,
      `Internal notes included: ${p.evidence.find((e) => e.internalNote)!.internalNote}`,
      7,
      6.15,
      5.7,
      0.3,
      1,
      12,
      muted,
    );

  s = page(2, "Options, Costs, Benefits");
  table(
    s,
    ["Alternative", "Initial investment", "Economic NPV", "Cash-only NPV"],
    p.options
      .slice(0, 4)
      .map((o) => [
        `${o.selected ? "Selected: " : ""}${o.name}`,
        amount(o.financial.investment, p),
        amount(o.financial.npv, p),
        amount(o.financial.cashNpv, p),
      ]),
    0.65,
    2.38,
    [3.8, 2.7, 2.7, 2.7],
  );
  text(
    s,
    `Alternatives rationale: ${p.alternativesRejected}. All ${p.options.length} alternatives and calculation issues are in the workbook.`,
    0.65,
    5.98,
    12,
    0.46,
    2,
    14,
  );

  s = page(3, "Options, Monthly flows, Costs, Benefits, Methods");
  if (f.monthly.length) {
    s.addChart(
      deck.ChartType.line,
      [
        {
          name: `Economic net (${p.currency})`,
          labels: f.monthly.map((m) => String(m.month)),
          values: f.monthly.map((m) => m.cumulative),
        },
        {
          name: `Cash net (${p.currency})`,
          labels: f.monthly.map((m) => String(m.month)),
          values: f.monthly.map((m) => m.cashCumulative),
        },
      ],
      {
        x: 0.65,
        y: 2.5,
        w: 7.65,
        h: 3.85,
        showTitle: true,
        title: "Cumulative net · months 0–36",
        titleFontSize: 16,
        showLegend: true,
        legendPos: "b",
        legendFontSize: 11,
        catAxisLabelFontSize: 10,
        valAxisLabelFontSize: 10,
        catAxisLabelFrequency: "6",
        chartColors: ["414C3C", "A96A49"],
        valAxisLabelFormatCode: "#,##0",
        lineDataSymbol: "none",
      },
    );
  } else
    card(
      s,
      "36-month economics",
      `Not assessed. ${f.issues.join("; ")}`,
      0.65,
      2.5,
      7.2,
      3.5,
    );
  card(
    s,
    pilot ? "Forecast → pilot projection" : "Steady-state value bridge",
    pilot
      ? `Annual hours: ${shown(pilot.forecast.annualHoursSaved)} → ${shown(pilot.projected.annualHoursSaved)}. Economic NPV: ${amount(pilot.forecast.npv, pilot)} → ${amount(pilot.projected.npv, pilot)}. Annualised, not realised savings.`
      : `Capacity: ${amount(f.capacityValue, p)}. Total benefit: ${amount(f.annualBenefit, p)}. Cash subset: ${amount(f.cashSavings, p)}. OPEX (year 1): ${amount(f.annualOpex, p)}.`,
    8.7,
    2.38,
    3.9,
    2,
  );
  card(
    s,
    "36-month decision metrics",
    pilot
      ? `Cash NPV: ${amount(pilot.forecast.cashNpv, pilot)} → ${amount(pilot.projected.cashNpv, pilot)}. Pilot-informed payback: ${metric(pilot.projected.paybackMonths, pilot.projected, "payback")}.`
      : `Economic NPV: ${amount(f.npv, p)}. Cash NPV: ${amount(f.cashNpv, p)}. Economic payback: ${metric(f.paybackMonths, f, "payback")}.`,
    8.7,
    4.65,
    3.9,
    1.7,
  );

  s = page(4, "Assumptions, Methods, Options");
  table(
    s,
    ["Sensitivity", `Low NPV (${p.currency})`, `High NPV (${p.currency})`],
    p.sensitivity.map((v) => [
      readable(v.field),
      ...[v.low, v.high].map((value) =>
        new Intl.NumberFormat("en-GB", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value),
      ),
    ]),
    0.65,
    2.38,
    [2.45, 2.1, 2.1],
  );
  card(
    s,
    "Selected assumptions",
    selected.inputs
      .filter((i) =>
        ["adoption", "reduction", "realisation", "cashShare"].includes(i.field),
      )
      .map(
        (i) =>
          `${readable(i.field)}: ${i.value === null ? "Not assessed" : `${(i.value * 100).toFixed(1)}%`}`,
      )
      .join(". "),
    7.65,
    2.38,
    4.9,
    1.6,
  );
  card(
    s,
    "Unknowns and boundaries",
    p.sensitivityIssue ||
      "Adoption/reduction ±10 percentage points; costs ±20%. One input at a time; no probability claims. Full provenance, owners and confidence in workbook.",
    7.65,
    4.35,
    4.9,
    1.9,
  );
  text(
    s,
    `Zero-NPV adoption: ${metric(f.breakEvenAdoption, f, "breakEven")}. Assumption history: ${p.assumptions.length} revisions.`,
    0.65,
    5.55,
    6.65,
    0.75,
    3,
    14,
  );

  s = page(5, "Overview, Evidence, Methods");
  table(
    s,
    ["Dimension", "Readiness"],
    p.readiness.map((r) => [
      r.dimension,
      r.state === "unknown" ? "Not assessed" : r.state,
    ]),
    0.65,
    2.38,
    [2.65, 2.65],
    0.57,
  );
  card(
    s,
    "Computed policy outcome",
    `${p.computedOutcome}. ${p.reasons.join(" ")}`,
    6.75,
    2.38,
    5.9,
    1.65,
  );
  card(
    s,
    p.evaluations.length
      ? "Evaluation and human controls"
      : `${p.blockers.length} open blockers`,
    p.evaluations.length
      ? `${p.evaluations.at(-1)!.mode}: ${p.evaluations.at(-1)!.metrics.correct}/${p.evaluations.at(-1)!.metrics.total} correct. ${p.evaluations.at(-1)!.metrics.unsupported} unsupported proposals, ${p.evaluations.at(-1)!.metrics.unsafeReleased} unsafe releases. Human review blocks unsupported outputs. No live LLM performance claimed. Full rows in workbook.`
      : p.blockers.slice(0, 2).join("; ") ||
          "No policy blockers recorded. This is not certification.",
    6.75,
    4.35,
    5.9,
    1.45,
  );
  text(
    s,
    p.tasks.length
      ? `Workflow: ${p.tasks
          .filter((t) => t.optionId === p.selectedOptionId)
          .map((t) => `${t.name} (${t.responsibility})`)
          .join(" / ")}. Full tasks and source links in workbook.`
      : `Critical controls: ${p.criticalControlsOpen ? "OPEN" : "none marked open"}. Full blocker list in workbook.`,
    6.75,
    5.96,
    5.9,
    0.44,
    2,
    14,
  );

  s = page(6, "Validation");
  p.validation.forEach((v, i) => {
    const x = i < 4 ? 0.65 : 7,
      y = 2.33 + (i % 4) * 1.01;
    text(
      s,
      readable(v.field).toUpperCase(),
      x,
      y,
      5.7,
      0.23,
      1,
      11,
      accent,
      true,
    );
    text(
      s,
      pilot && v.field === "hypotheses"
        ? `Pilot: ${pilot.disposition}. Adoption (fraction) ${shown(pilot.metrics.adoption)}; reviewed success (fraction) ${shown(pilot.metrics.successRate)}; recorded cost ${amount(pilot.metrics.totalCost, pilot)}.`
        : pilot && v.field === "method"
          ? `${pilot.source}. ${pilot.limitations} Full measurements: Pilot observations workbook.`
          : v.field === "budgetCeiling"
            ? amount(v.value as number | null, p)
            : shown(v.value),
      x,
      y + 0.27,
      5.7,
      0.63,
      3,
      14,
    );
  });

  s = page(7, "Overview, Validation, Methods");
  card(s, "Recommendation", `${p.outcome}. ${p.rationale}`, 0.65, 2.38);
  card(
    s,
    "Conditions",
    [
      ...p.partner.conditions,
      ...(pilot
        ? [`Pilot: ${pilot.disposition}${pilot.stale ? " — stale basis" : ""}`]
        : []),
    ].join(" ") || p.conditions,
    7,
    2.38,
  );
  card(
    s,
    "Next decision",
    `${p.partner.nextDecisionDate}. Owner: ${p.partner.owner}. Sponsor: ${shown(p.sponsor)}. ${p.partner.nextStep}`,
    0.65,
    4.38,
  );
  card(
    s,
    p.strategicException ? "Strategic exception" : "Limitations",
    p.strategicException ||
      `${p.constraints} Synthetic assumptions; practitioner validation has not been conducted.`,
    7,
    4.38,
  );
  return (await deck.write({ outputType: "blob" })) as Blob;
}
