import { assessProject, type Project } from "./model";
import { calculateEconomics } from "./economics";

export const currency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
export const compact = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
export const percent = (value: number) => Math.round(value * 100) + "%";
export const number = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
export function downloadFile(
  name: string,
  content: string | Blob,
  type = "text/plain",
) {
  const blob =
    typeof content === "string" ? new Blob([content], { type }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function decisionBrief(project: Project) {
  const result = calculateEconomics(project.inputs);
  const gate = assessProject(project);
  const decision = project.decisions.at(-1);
  return [
    "# " + project.name,
    "Aster Financial Group · independent synthetic demonstration by Beck",
    "Snapshot: " + new Date().toISOString() + " · revision " + project.revision,
    "",
    "## Decision requested",
    gate.recommendation + " — " + gate.reasons.join(" "),
    "",
    "## Client objective",
    project.goal,
    "Sponsor: " + project.sponsor + " | Delivery lead: " + project.lead,
    "",
    "## Business case (USD)",
    "Initial investment: " + currency(project.inputs.implementationCost),
    "Annual operating cost: " + currency(project.inputs.annualRunCost),
    "Steady-state hours released: " + number(result.annualHoursSaved),
    "Equivalent productive capacity: " +
      result.fteCapacity.toFixed(2) +
      " FTE (not a headcount reduction)",
    "Annual economic benefit: " + currency(result.annualBenefit),
    "Annual cash-saving subset: " + currency(result.cashSavings),
    "First-year net economic result: " + currency(result.yearOneNet),
    "First-year economic ROI: " +
      (result.firstYearRoi === null
        ? "Not applicable"
        : percent(result.firstYearRoi)),
    "Three-year economic NPV: " + currency(result.npv),
    "Three-year cash-only NPV: " + currency(result.cashNpv),
    "Economic payback: " +
      (result.paybackMonths === null
        ? "Not within 36 months"
        : result.paybackMonths.toFixed(1) + " months"),
    "Capacity value includes assumed redeployment. Cash savings require a verified mechanism; cash and capacity benefit are not added together.",
    "",
    "## Pilot observations",
    project.measurements
      ? JSON.stringify(project.measurements, null, 2)
      : "No pilot measurements recorded.",
    "",
    "## Delivery and risks",
    ...project.tasks.map(
      (t) =>
        "- " +
        (t.done ? "Done" : "Open") +
        ": " +
        t.title +
        " · " +
        t.owner +
        " · day " +
        t.dueDay,
    ),
    ...project.risks
      .filter((r) => !r.closed)
      .map(
        (r) =>
          "- " +
          r.severity +
          ": " +
          r.title +
          " · " +
          r.owner +
          " · " +
          r.mitigation,
      ),
    "",
    "## Evidence",
    ...project.evidence.map(
      (e) =>
        "- [" +
        e.status +
        "] " +
        e.title +
        " · " +
        e.locator +
        " — " +
        e.excerpt +
        " Review: " +
        e.note,
    ),
    "",
    "## Latest human decision",
    decision
      ? decision.decision +
        " · " +
        decision.owner +
        " · " +
        decision.rationale +
        " Conditions: " +
        decision.conditions +
        " Follow-up: " +
        decision.followUp +
        " · based on revision " +
        decision.revision +
        (decision.revision !== project.revision
          ? " (stale: reassessment required)"
          : "")
      : "No human decision recorded.",
    "",
    "## Assumptions",
    ...Object.entries(project.inputs).map(
      ([key, value]) => "- " + key + ": " + value,
    ),
    "",
    "Synthetic fixtures and local records; no live model, account, or external action.",
  ].join("\n");
}
export async function exportSteeringPack(project: Project) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const deck = new PptxGenJS();
  deck.layout = "LAYOUT_WIDE";
  deck.author = "Beck";
  deck.title = project.name;
  deck.subject = "Independent synthetic client delivery demonstration";
  const result = calculateEconomics(project.inputs);
  const gate = assessProject(project);
  const pages = [
    {
      title: project.name,
      subtitle: "01 / CLIENT OBJECTIVE",
      lines: [
        project.summary,
        project.goal,
        "Sponsor: " + project.sponsor,
        "Delivery lead: " + project.lead,
      ],
    },
    {
      title: "Evidence before commitment",
      subtitle: "02 / BASELINE & ASSUMPTIONS",
      lines: project.evidence.map(
        (e) => "[" + e.status + "] " + e.title + ": " + e.excerpt,
      ),
    },
    {
      title: "A controlled operating model",
      subtitle: "03 / SOLUTION & ACCOUNTABILITY",
      lines: [
        "Source → prepare → validate → human review → outcome",
        "Selected option: " + project.option,
        "Sample outputs illustrate design; they do not establish live model quality.",
        "A named reviewer owns unsupported outputs and escalation.",
        "Review effort is included in the financial model.",
      ],
    },
    {
      title: "Value with explicit assumptions",
      subtitle: "04 / BUSINESS CASE",
      lines: [
        "Investment " +
          currency(project.inputs.implementationCost) +
          " · annual OPEX " +
          currency(project.inputs.annualRunCost),
        "Annual hours released " +
          number(result.annualHoursSaved) +
          " · capacity " +
          result.fteCapacity.toFixed(2) +
          " FTE",
        "Economic NPV " +
          currency(result.npv) +
          " · cash-only NPV " +
          currency(result.cashNpv),
        "First-year net economic result " + currency(result.yearOneNet),
        "Economic payback " +
          (result.paybackMonths === null
            ? "not within 36 months"
            : result.paybackMonths.toFixed(1) + " months"),
        "Capacity is not automatic cash savings. Cash benefit is a subset, never added twice.",
      ],
    },
    {
      title: "Delivery through measurable gates",
      subtitle: "05 / PILOT & DELIVERY",
      lines: [
        project.tasks.filter((t) => t.done).length +
          " of " +
          project.tasks.length +
          " delivery milestones complete",
        "Budget cap " +
          currency(project.budgetCap) +
          " · actual spend " +
          currency(project.actualSpend),
        ...(project.measurements
          ? [
              "Pilot adoption " +
                percent(project.measurements.adoption) +
                " · quality " +
                percent(project.measurements.quality),
              "Human effort " +
                project.measurements.minutesAfter +
                " minutes · n=" +
                project.measurements.sampleSize +
                " · " +
                project.measurements.source,
            ]
          : ["Pilot results are not yet recorded."]),
        ...project.risks
          .filter((r) => !r.closed)
          .map((r) => r.title + " — " + r.owner),
      ],
    },
    {
      title: gate.recommendation,
      subtitle: "06 / DECISION & NEXT ACTIONS",
      lines: [
        gate.reasons.join(" "),
        ...(project.decisions.at(-1)
          ? [
              "Human decision: " + project.decisions.at(-1)!.decision,
              project.decisions.at(-1)!.rationale,
              "Conditions: " + project.decisions.at(-1)!.conditions,
              "Owner: " +
                project.decisions.at(-1)!.owner +
                " · follow-up " +
                project.decisions.at(-1)!.followUp,
              "Decision revision " +
                project.decisions.at(-1)!.revision +
                " · current revision " +
                project.revision,
            ]
          : ["Decision remains with the accountable sponsor."]),
      ],
    },
  ];
  for (const page of pages) {
    const slide = deck.addSlide();
    slide.background = { color: "F3F2EC" };
    slide.addText(page.subtitle, {
      x: 0.6,
      y: 0.5,
      w: 12,
      h: 0.3,
      fontSize: 11,
      color: "3157D5",
      bold: true,
    });
    slide.addText(page.title, {
      x: 0.6,
      y: 1,
      w: 12,
      h: 0.9,
      fontSize: 28,
      bold: true,
      color: "20221E",
      breakLine: false,
    });
    slide.addText(page.lines.map((line) => "• " + line).join("\n\n"), {
      x: 0.7,
      y: 2.1,
      w: 11.8,
      h: 4.6,
      fontSize: 16,
      color: "33372F",
      fit: "shrink",
      margin: 0,
    });
    slide.addText(
      "BECK · SYNTHETIC DEMONSTRATION · " +
        new Date().toLocaleDateString("en-US") +
        " · REVISION " +
        project.revision,
      { x: 0.6, y: 7.05, w: 12, h: 0.2, fontSize: 9, color: "5F6259" },
    );
  }
  await deck.writeFile({ fileName: project.id + "-steering-pack.pptx" });
}
