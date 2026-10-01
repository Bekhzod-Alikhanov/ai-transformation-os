import type { FinancialResult } from "../economics";
import type { ExportPayload } from "./payload";

export const shown = (value: string | number | null | undefined): string =>
  value === null || value === undefined || value === ""
    ? "Not assessed"
    : String(value);
export const amount = (value: number | null, p: ExportPayload): string =>
  value === null
    ? "Not assessed"
    : new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: p.currency,
        currencyDisplay: "code",
        maximumFractionDigits: 2,
      }).format(value);
export function metric(
  value: number | null,
  f: FinancialResult,
  kind: "roi" | "payback" | "breakEven",
) {
  if (value === null)
    return f.status !== "complete"
      ? "Not assessed"
      : kind === "roi"
        ? "Not defined (no positive initial investment)"
        : kind === "payback"
          ? "Not reached within 36 months"
          : "Unattainable within 0–100% adoption";
  return kind === "payback"
    ? `${value.toFixed(1)} months`
    : `${(value * 100).toFixed(1)}%`;
}
// Escape arbitrary text, including HTML and links, rather than emitting raw Markdown.
const md = (value: string | number | null) =>
  shown(value)
    .replace(/\s+/g, " ")
    .replace(/[\\`*_{}\[\]<>#|!]/g, "\\$&");
const excerpt = (value: string, limit = 350) =>
  value.length <= limit
    ? value
    : `${value.slice(0, limit)}… (full text: review workbook)`;
export function provenance(p: ExportPayload) {
  return `${p.status} · source revision ${p.sourceRevision} · as of ${p.asOf} · current revision ${p.currentRevision}${p.stale ? " · historical snapshot is stale against current case" : ""}`;
}
export function investmentBrief(p: ExportPayload): string {
  const selected = p.options.find((o) => o.selected)!;
  const f = selected.financial;
  return (
    [
      `# ${md(p.title)}`,
      `**${p.status}**`,
      p.notice,
      `${md(provenance(p))}. Engagement revision ${p.engagementRevision}; model ${p.modelVersion}; schema ${p.schemaVersion}.`,
      `Client: ${md(p.client)} · Engagement: ${md(p.engagement)} · Currency: ${p.currency} (no FX conversion).`,
      `## Decision requested`,
      `${md(p.outcome)} — ${md(selected.name)}. Computed policy outcome: ${md(p.computedOutcome)}.`,
      `Objective: ${md(excerpt(p.objectives))}`,
      `Problem: ${md(excerpt(p.problem))}`,
      `Rationale: ${md(p.rationale)}`,
      `Conditions: ${md(p.conditions)}`,
      ...(p.strategicException
        ? [
            `Strategic exception (does not change calculated value): ${md(p.strategicException)}`,
          ]
        : []),
      `## Alternatives and economics`,
      p.basis,
      [
        `| Alternative | Status | Initial investment | Economic NPV | Cash-only NPV |`,
        `| --- | --- | --- | --- | --- |`,
        ...p.options.map(
          (o) =>
            `| ${md(o.name)}${o.selected ? " (selected)" : ""} | ${o.financial.status} | ${amount(o.financial.investment, p)} | ${amount(o.financial.npv, p)} | ${amount(o.financial.cashNpv, p)} |`,
        ),
      ].join("\n"),
      `Alternatives rationale: ${md(p.alternativesRejected)}`,
      `Selected annual released hours: ${shown(f.annualHoursSaved)}; FTE capacity: ${shown(f.fteCapacity)}. Steady-state economic benefit: ${amount(f.annualBenefit, p)}; cash subset: ${amount(f.cashSavings, p)}; recurring OPEX (year 1): ${amount(f.annualOpex, p)}.`,
      `First-year economic net (includes ramp): ${amount(f.firstYearNet, p)}; cash net: ${amount(f.firstYearCashNet, p)}. 36-month economic net: ${amount(f.threeYearNet, p)}.`,
      `Economic ROI (year 1): ${metric(f.economicRoi, f, "roi")}; cash ROI (year 1): ${metric(f.cashRoi, f, "roi")}. Economic payback: ${metric(f.paybackMonths, f, "payback")}; cash payback: ${metric(f.cashPaybackMonths, f, "payback")}.`,
      `Zero-NPV adoption: ${metric(f.breakEvenAdoption, f, "breakEven")}. Economic hurdle: ${amount(p.economicHurdle, p)}. Budget ceiling: ${amount(p.budgetCeiling, p)}.`,
      `Cash mechanism: ${md(selected.cashMechanism)}. Review allocation: ${md(selected.reviewAllocation)}.`,
      `## Readiness, evidence and gaps`,
      ...p.readiness.map(
        (r) =>
          `- ${r.dimension}: ${r.state === "unknown" ? "Not assessed" : r.state}`,
      ),
      ...p.reasons.map((r) => `- ${md(r)}`),
      ...p.blockers.slice(0, 6).map((r) => `- Open: ${md(r)}`),
      ...(p.blockers.length > 6
        ? [
            `- ${p.blockers.length - 6} further blockers: see the full list in the workbook Overview.`,
          ]
        : []),
      ...f.issues.slice(0, 4).map((r) => `- Calculation: ${md(r)}`),
      ...(f.issues.length > 4
        ? [
            `- ${f.issues.length - 4} further calculation issues: see workbook Options.`,
          ]
        : []),
      ...(p.evidence.length
        ? p.evidence.map(
            (e) =>
              `- ${md(excerpt(e.title, 120))} — ${e.status}, source v${e.version}, ${md(e.date)}; ${md(excerpt(e.source, 160))}, ${md(excerpt(e.locator, 120))}. ${md(excerpt(e.excerpt))}${p.includeInternalNotes && e.internalNote ? ` Internal note: ${md(e.internalNote)}` : ""}`,
          )
        : ["- Evidence: Not assessed"]),
      ...p.requests
        .filter((r) => r.status === "open")
        .map(
          (r) =>
            `- Request: ${md(r.question)}; owner: ${md(r.owner)}; decision impact: ${md(r.impact)}`,
        ),
      `## Validation handover`,
      ...p.validation.map(
        (v) =>
          `- ${v.field}: ${v.field === "budgetCeiling" ? amount(v.value as number | null, p) : md(v.value)}`,
      ),
      `Next decision date: ${md(p.nextDecisionDate)}. Sponsor: ${md(p.sponsor)}; process owner: ${md(p.processOwner)}; lead: ${md(p.lead)}.`,
      `## Sensitivity and limitations`,
      ...p.sensitivity.map(
        (s) =>
          `- ${s.field}: low-setting NPV ${amount(s.low, p)}; high-setting NPV ${amount(s.high, p)}.`,
      ),
      ...(p.sensitivityIssue ? [`Sensitivity: ${md(p.sensitivityIssue)}`] : []),
      `Constraints: ${md(p.constraints)}`,
      ...p.methods
        .filter((m) =>
          [
            "Basis",
            "Sensitivity",
            "Precision and unknowns",
            "Limitations",
          ].includes(m.method),
        )
        .map((m) => `${m.method}: ${m.definition}`),
      `Source appendix: the review workbook contains full evidence, assumption revision history, all option inputs, cost/benefit lines, monthly flows and formula definitions. Internal notes ${p.includeInternalNotes ? "included by explicit choice" : "excluded"}.`,
    ].join("\n\n") + "\n"
  );
}
