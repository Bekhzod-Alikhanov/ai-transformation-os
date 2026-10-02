import { assessOpportunity } from "../assessment";
import { calculateOption, sensitivityOption } from "../economics";
import type { Engagement, Workspace } from "../types";
import type { DeliverablesProps } from "../ui/surface";
import { artifactAccent } from "../brand";
import { compareInvestment } from "../decision";
import { evaluationMetrics } from "../evaluation";
import { assessPilot } from "../pilot";

export const DISCLOSURE =
  "Synthetic assessment only. Advisory projections, not measured client results or certification.";
export const inputFields = [
  "annualVolume",
  "minutesBefore",
  "reduction",
  "reviewMinutes",
  "adoption",
  "hourlyCost",
  "realisation",
  "cashShare",
  "productiveHours",
  "rampMonths",
  "discountRate",
] as const;
export const validationFields = [
  "hypotheses",
  "baseline",
  "thresholds",
  "method",
  "owner",
  "budgetCeiling",
  "controls",
  "stopCriteria",
] as const;
export const METHODS = [
  [
    "Basis",
    "Saved base inputs only; each alternative independently compared with the captured business-as-usual option. What-if scenarios and simulation previews do not replace the recommendation basis.",
  ],
  [
    "Hours",
    "Annual hours = volume × max(0, minutes before × reduction − review minutes) / 60 × adoption. Excess review requires explicit separate costing before calculation.",
  ],
  [
    "Capacity",
    "FTE capacity = released hours / productive hours. Labour value = hours × hourly cost × realisation; capacity is not automatically cash.",
  ],
  [
    "Benefits",
    "Enabled quality and incremental contribution-margin benefits × adoption are added to labour value. Cash is a subset using each cash share; never added again to economic value. Overlapping pools require explicit allocation.",
  ],
  [
    "Costs",
    "Costs follow the entered one-time/monthly/annual start and end months (inclusive). Initial investment is month-zero incremental cost; annual OPEX sums recurring incremental costs in months 1–12, not accounting advice.",
  ],
  [
    "Monthly ramp",
    "Months 1–36 use min(1, month / ramp months), or full benefit if ramp is zero. Month zero has cost only. Monthly net = incremental benefit − incremental cost; cumulative includes month zero.",
  ],
  [
    "NPV",
    "NPV = sum of monthly incremental net / (1 + annual discount rate)^(month / 12), months 0–36. Economic and cash-only NPV use separate benefit streams.",
  ],
  [
    "ROI and payback",
    "First-year ROI = incremental net in months 0–12 / positive month-zero investment. If no positive initial investment, ROI is undefined. Payback is the first month of sustained nonnegative cumulative net through month 36; later negative balances reset the earlier crossing. No fractional-month interpolation. A completed null means not reached within 36 months.",
  ],
  [
    "Break-even",
    "Break-even adoption is the 0–100% adoption needed for zero economic NPV, not the configured hurdle. Completed null means unattainable. Maximum viable investment holds other inputs fixed at zero NPV; a negative result means no viable nonnegative initial investment.",
  ],
  [
    "Sensitivity",
    "One input at a time: adoption/reduction ±10 percentage points within 0–100%; costs ×0.8 / ×1.2. Deterministic tests, not probabilities. BAU sensitivity is not applicable. Invalid perturbations are reported, never replaced with zero.",
  ],
  [
    "Precision and unknowns",
    "Decimal.js assessment-v2.1 engine; monetary outputs rounded to two decimals. Not assessed is distinct from zero. Workbook cells contain computed values and literal text, not a second financial engine.",
  ],
  [
    "Limitations",
    "Synthetic, local-only advisory tool. Evidence acceptance does not verify truth. No FX conversion, correlations, tax, inflation or benefits beyond 36 months modelled. No human practitioner validation or NIST certification claimed.",
  ],
] as const;

/** An allowlisted projection: raw snapshots, legacy data and recursive histories
 * never cross this boundary. Notes exist only when explicitly opted in. */
export function prepareSelection(
  { selection, brand, includeInternalNotes }: DeliverablesProps,
  currentRevision?: number,
) {
  const snapshot = selection.kind === "snapshot" ? selection.snapshot : null;
  const e =
    selection.kind === "snapshot"
      ? selection.snapshot.engagement
      : selection.engagement;
  const o =
    selection.kind === "snapshot"
      ? selection.snapshot.opportunity
      : selection.opportunity;
  const selected = o.options.find((x) => x.id === o.selectedOptionId);
  const bau = o.options.find((x) => x.kind === "bau");
  if (!selected || !bau)
    throw new Error(
      "The saved case needs a selected option and a business-as-usual comparison. Restore a validated backup or repair the saved options.",
    );
  const assessment =
    snapshot?.assessment ??
    (selection.kind === "draft"
      ? assessOpportunity(selection.engagement, selection.opportunity)
      : null)!;
  const options = o.options.map((option) => ({
    id: option.id,
    name: option.name,
    kind: option.kind,
    selected: option.id === selected.id,
    inputs: inputFields.map((field) => ({
      field,
      value: option.inputs[field],
    })),
    cashMechanism: option.cashMechanism,
    reviewAllocation: option.reviewAllocation,
    costs: option.costs.map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      amount: c.amount,
      frequency: c.frequency,
      startMonth: c.startMonth,
      endMonth: c.endMonth,
      accounting: c.accounting,
    })),
    benefits: option.benefits.map((b) => ({
      id: b.id,
      name: b.name,
      kind: b.kind,
      annualAmount: b.annualAmount,
      pool: b.pool,
      cashShare: b.cashShare,
      enabled: b.enabled,
      overlapResolved: b.overlapResolved,
      mechanism: b.mechanism,
    })),
    financial: calculateOption(option, bau),
  }));
  let sensitivity: { field: string; low: number; high: number }[] = [];
  let sensitivityIssue = "";
  try {
    sensitivity = Object.entries(sensitivityOption(selected, bau)).map(
      ([field, v]) => ({ field, low: v.low, high: v.high }),
    );
  } catch (error) {
    sensitivityIssue =
      error instanceof Error
        ? error.message
        : "Sensitivity could not be calculated.";
  }
  const sourceRevision = snapshot?.sourceRevision ?? o.revision;
  const comparison = compareInvestment(e as Engagement, {
    ...o,
    recommendations: [],
  });
  const pilots = (o.pilots ?? []).map((pilot) => {
    const a = assessPilot(
      e as Engagement,
      { ...o, recommendations: [] },
      pilot,
    );
    return {
      id: pilot.id,
      currency: pilot.forecast.currency,
      hourlyCost: pilot.forecast.option.inputs.hourlyCost,
      forecastRevision: pilot.forecast.sourceRevision,
      name: pilot.name,
      optionId: pilot.optionId,
      owner: pilot.owner,
      at: pilot.at,
      startDate: pilot.startDate,
      endDate: pilot.endDate,
      limitations: pilot.limitations,
      source: pilot.source,
      rationale: pilot.rationale,
      eligibleCases: pilot.eligibleCases,
      assistedCases: pilot.assistedCases,
      successfulOutcomes: pilot.successfulOutcomes,
      unsafeReleased: pilot.unsafeReleased,
      budget: pilot.budget,
      nonLabourSpend: pilot.nonLabourSpend,
      otherHumanMinutes: pilot.otherHumanMinutes,
      thresholds: { ...pilot.thresholds },
      observations: pilot.observations.map((r) => ({
        ...r,
        task:
          pilot.forecast.option.taskPlan?.rows.find((t) => t.id === r.taskId)
            ?.name ?? "Historical task",
      })),
      metrics: a.metrics,
      forecast: a.forecast,
      projected: a.projected,
      disposition: a.disposition,
      reasons: a.reasons.map((r) => r.message),
      stale: a.stale,
      baselineDiscrepancies: a.baselineDiscrepancies,
      changes: a.changes.map((c) => ({
        ...c,
        label: c.field.startsWith("tasks.")
          ? `${pilot.forecast.option.taskPlan?.rows.find((t) => t.id === c.field.split(".")[1])?.name ?? "Historical task"} / ${c.field.split(".")[2]}`
          : c.field,
      })),
      applied: (o.pilotApplications ?? [])
        .filter((r) => r.pilotId === pilot.id)
        .map((r) => ({
          at: r.at,
          owner: r.owner,
          rationale: r.rationale,
          changes: r.changes.map((c) => ({ ...c })),
        })),
    };
  });
  const latestPilot = pilots.filter((p) => p.optionId === selected.id).at(-1);
  const partnerConditions = [
    ...new Set([
      ...(snapshot?.conditions ? [snapshot.conditions] : []),
      ...(latestPilot?.reasons ?? []),
      ...assessment.blockers.map((b) => b.message),
      ...o.requests
        .filter((r) => r.status === "open")
        .map((r) => `${r.question} — ${r.owner || "owner unassigned"}`),
    ]),
  ].slice(0, 3);
  return {
    title: `${brand.name || "Assessment"} · ${o.name || "Untitled opportunity"}`,
    brand: {
      name: brand.name || "Assessment",
      accent: artifactAccent(brand.accent),
    },
    notice: DISCLOSURE,
    modelVersion: selected.taskPlan ? "assessment-v3.0" : "assessment-v2.1",
    schemaVersion: 3,
    pilots,
    partner: {
      preferred: comparison.preferredName,
      decision: snapshot?.outcome ?? assessment.outcome,
      selected: selected.name,
      why: snapshot?.rationale ?? comparison.reasons.join(" "),
      alternatives: snapshot?.alternativesRejected || comparison.reasons[0],
      conditions: partnerConditions,
      owner:
        latestPilot?.owner ||
        o.validation.owner ||
        e.processOwner ||
        "Owner unassigned",
      nextDecisionDate:
        snapshot?.nextDecisionDate || e.decisionDeadline || "Date not set",
      nextStep: latestPilot
        ? `${latestPilot.disposition}: ${latestPilot.reasons[0] ?? "Sponsor review required"}`
        : "Collect representative pilot timings and validate controls before scaling.",
      latestPilotId: latestPilot?.id ?? null,
    },
    comparison: {
      outcome: comparison.outcome,
      preferredName: comparison.preferredName,
      objective: comparison.policy.objective,
      paybackCeiling: comparison.policy.paybackCeiling,
      reasons: comparison.reasons,
      reversalConditions: comparison.reversalConditions,
    },
    tasks: o.options.flatMap((option) =>
      (option.taskPlan?.rows ?? []).map((r) => ({
        optionId: option.id,
        optionName: option.name,
        id: r.id,
        name: r.name,
        annualVolume: r.annualVolume,
        currentMinutes: r.currentMinutes,
        responsibility: r.responsibility,
        eligible: r.eligible,
        adoption: option.inputs.adoption,
        referenceReduction: option.taskPlan?.referenceReduction ?? null,
        selectedReduction: option.inputs.reduction,
        baselineKey: r.baselineKey ?? null,
        remainingMinutes: r.remainingMinutes,
        reviewMinutes: r.reviewMinutes,
        exceptionRate: r.exceptionRate,
        exceptionMinutes: r.exceptionMinutes,
        evidenceIds: [...r.evidenceIds],
        assumed: r.assumed,
      })),
    ),
    questions: (o.questions ?? []).map((q) => ({
      area: q.area,
      question: q.question,
      answer: q.answer,
      owner: q.owner,
      evidenceIds: [...q.evidenceIds],
      unresolved: q.unresolved,
    })),
    evaluations: (o.evaluations ?? []).map((r) => ({
      id: r.id,
      optionId: r.optionId,
      datasetVersion: r.datasetVersion,
      mode: r.mode,
      at: r.at,
      inputRevision: r.inputRevision,
      metrics: evaluationMetrics(r),
      cases: r.cases.map((c) => ({
        input: c.input,
        expected: c.expected,
        output: c.output,
        supported: c.supported,
        escalated: c.escalated,
        control: c.control,
        sourceRefs: [...c.sourceRefs],
        events: c.events.map((v) => ({ stage: v.stage, detail: v.detail })),
      })),
    })),
    kind: snapshot ? "snapshot" : "draft",
    status: snapshot
      ? options.find((x) => x.selected)!.financial.status === "complete"
        ? "Reviewed snapshot"
        : "Reviewed recommendation snapshot — incomplete assessment / draft economics"
      : "Draft / not reviewed",
    snapshotId: snapshot?.id ?? null,
    asOf:
      snapshot?.at ??
      (selection.kind === "draft"
        ? selection.engagement.history.at(-1)?.at
        : undefined) ??
      (e.assessmentDate || "Not assessed"),
    sourceRevision,
    engagementRevision: e.revision,
    currentRevision: currentRevision ?? sourceRevision,
    stale:
      snapshot !== null &&
      currentRevision !== undefined &&
      sourceRevision !== currentRevision,
    engagement: e.name,
    opportunity: o.name,
    client: e.client,
    currency: e.currency,
    sponsor: e.sponsor,
    processOwner: e.processOwner,
    lead: e.lead,
    problem: o.problem || e.problem,
    objectives: e.objectives,
    constraints: e.constraints,
    deadline: e.decisionDeadline,
    selectedOptionId: selected.id,
    basis: "Saved base · incremental to business as usual · 36 months",
    outcome: snapshot?.outcome ?? assessment.outcome,
    computedOutcome: assessment.outcome,
    rationale:
      snapshot?.rationale ??
      "Unreviewed saved base. Record a recommendation before presenting a reviewed decision.",
    conditions: snapshot?.conditions ?? "Not assessed",
    alternativesRejected: snapshot?.alternativesRejected ?? "Not assessed",
    nextDecisionDate: snapshot?.nextDecisionDate ?? e.decisionDeadline,
    strategicException: snapshot?.strategicException ?? "",
    readiness: Object.entries(assessment.dimensions).map(
      ([dimension, state]) => ({ dimension, state }),
    ),
    reasons: assessment.reasons.map((x) => x),
    blockers: assessment.blockers.map((x) => x.message),
    criticalControlsOpen: o.criticalControlsOpen,
    economicHurdle: o.economicHurdle,
    budgetCeiling: o.budgetCeiling,
    validation: validationFields.map((field) => ({
      field,
      value: o.validation[field],
    })),
    evidence: o.evidence.map((v) => ({
      id: v.id,
      title: v.title,
      excerpt: v.excerpt,
      source: v.source,
      locator: v.locator,
      date: v.date,
      status: v.status,
      reviewRationale: v.reviewRationale,
      reviewedAt: v.reviewedAt,
      version: v.version,
      ...(includeInternalNotes ? { internalNote: v.internalNote } : {}),
    })),
    assumptions: o.assumptions.map((a) => ({
      id: a.id,
      optionId: a.optionId,
      field: a.field,
      value: a.value,
      unit: a.unit,
      provenance: a.provenance,
      confidence: a.confidence,
      evidenceIds: [...a.evidenceIds],
      owner: a.owner,
      version: a.version,
      at: a.at,
      material: a.material,
    })),
    requests: o.requests.map((r) => ({
      question: r.question,
      owner: r.owner,
      impact: r.impact,
      status: r.status,
    })),
    discovery: Object.entries(o.discovery).map(([area, value]) => ({
      area,
      notes: value.notes,
    })),
    options,
    sensitivity,
    sensitivityIssue,
    includeInternalNotes,
    methods: METHODS.map(([method, definition]) => ({
      method,
      definition:
        method === "Hours" && selected.taskPlan
          ? "Task future minutes = (1 − eligible × adoption) × current minutes + eligible × adoption × (remaining handling + human review + exception rate × exception handling). Hours released = sum volume × (current − future) / 60. Negative values are added human workload. Gross-reduction sensitivity scales handling savings relative to the task plan reference; it never scales review or exceptions."
          : method === "Precision and unknowns" && selected.taskPlan
            ? definition.replace("assessment-v2.1", "assessment-v3.0")
            : definition,
    })),
  };
}
export type ExportPayload = ReturnType<typeof prepareSelection>;
export function prepareExport(
  engagement: Engagement,
  opportunityId: string,
  brand: Workspace["brand"],
  options: { snapshotId?: string; includeInternalNotes?: boolean } = {},
): ExportPayload {
  const opportunity = engagement.opportunities.find(
    (o) => o.id === opportunityId,
  );
  if (!opportunity)
    throw new Error(
      "Opportunity not found. Reopen a saved opportunity before exporting.",
    );
  const snapshot = options.snapshotId
    ? opportunity.recommendations.find((s) => s.id === options.snapshotId)
    : undefined;
  if (options.snapshotId && !snapshot)
    throw new Error(
      "Reviewed snapshot not found. Choose an available snapshot or the current draft.",
    );
  return prepareSelection(
    {
      selection: snapshot
        ? { kind: "snapshot", snapshot }
        : { kind: "draft", engagement, opportunity },
      brand,
      includeInternalNotes: options.includeInternalNotes ?? false,
    },
    opportunity.revision,
  );
}
