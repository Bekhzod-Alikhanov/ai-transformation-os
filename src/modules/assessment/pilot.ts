import Decimal from "decimal.js";
import {
  pilotDraftSchema,
  pilotRevisionSchema,
  type Engagement,
  type Opportunity,
  type PilotDraft,
  type PilotRevision,
  type SolutionOption,
} from "./types";
import { calculateOption, type FinancialResult } from "./economics";
import { assessOpportunity } from "./assessment";
import { evaluationGate } from "./evaluation";

const round = (n: Decimal, places = 6) => {
  const value = n.toDecimalPlaces(places).toNumber();
  if (!Number.isFinite(value))
    throw new Error("Pilot result exceeds the representable range.");
  return value;
};
function stable(value: unknown): string {
  const sort = (item: unknown): unknown =>
    Array.isArray(item)
      ? item.map(sort)
      : item && typeof item === "object"
        ? Object.fromEntries(
            Object.entries(item)
              .filter(([, v]) => v !== undefined)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, v]) => [k, sort(v)]),
          )
        : item;
  return JSON.stringify(sort(value));
}
export function pilotBasis(o: Opportunity, optionId: string) {
  const clean = (x: SolutionOption | undefined) =>
    x && { ...x, simulation: undefined };
  return stable({
    option: clean(o.options.find((x) => x.id === optionId)),
    bau: clean(o.options.find((x) => x.kind === "bau")),
    budget: o.budgetCeiling,
    policy: o.decisionPolicy,
    hurdle: o.economicHurdle,
  });
}
export function createPilotDraft(
  e: Engagement,
  o: Opportunity,
  performance?: "target" | "high_review",
): PilotDraft {
  const option = o.options.find((x) => x.id === o.selectedOptionId)!,
    bau = o.options.find((x) => x.kind === "bau")!;
  const fixture = !!performance;
  return {
    version: 1,
    optionId: option.id,
    name: fixture
      ? `Synthetic ${performance === "target" ? "target performance" : "high-review-effort performance"}`
      : "Pilot results",
    startDate: fixture ? "2026-09-01" : "",
    endDate: fixture ? "2026-09-28" : "",
    owner: fixture ? "Beck" : "",
    limitations: fixture
      ? "Authored synthetic timing exercise, not observed client results. Timed tasks represent 90 assisted cases; no inference of production reliability. Annual workload, eligibility and cash mechanism remain assumptions."
      : "",
    source: fixture ? "Synthetic pilot exercise / timed task totals" : "",
    rationale: fixture
      ? "Illustrative result set for review, not a validated investment conclusion."
      : "",
    eligibleCases: fixture ? 100 : null,
    assistedCases: fixture ? 90 : null,
    successfulOutcomes: fixture ? 87 : null,
    unsafeReleased: fixture ? 0 : null,
    budget: fixture ? 5000 : null,
    nonLabourSpend: fixture ? 500 : null,
    otherHumanMinutes: fixture ? 120 : null,
    thresholds: { adoption: 0.7, successRate: 0.95 },
    observations: (option.taskPlan?.rows ?? []).map((t) => ({
      taskId: t.id,
      sampleCount: fixture ? 90 : null,
      manualMinutes:
        fixture && t.currentMinutes !== null
          ? round(new Decimal(t.currentMinutes).times(90))
          : null,
      handlingMinutes:
        fixture && t.remainingMinutes !== null
          ? round(new Decimal(t.remainingMinutes).times(90))
          : null,
      reviewMinutes:
        fixture && t.reviewMinutes !== null
          ? round(
              new Decimal(
                performance === "high_review" ? 12 : t.reviewMinutes,
              ).times(90),
            )
          : null,
      exceptions: fixture ? 9 : null,
      exceptionMinutes:
        fixture && t.exceptionMinutes !== null
          ? round(new Decimal(t.exceptionMinutes).times(9))
          : null,
    })),
    forecast: {
      basis: pilotBasis(o, option.id),
      option: structuredClone(option),
      bau: structuredClone(bau),
      sourceRevision: o.revision,
      currency: e.currency,
    },
  };
}
export type PilotAssessment = {
  metrics: {
    adoption: number | null;
    successRate: number | null;
    manualHours: number | null;
    futureHours: number | null;
    hoursReleased: number | null;
    totalCost: number | null;
    costPerSuccess: number | null;
  };
  forecast: FinancialResult;
  projected: FinancialResult;
  disposition:
    "Investigate" | "Extend pilot" | "Fix" | "Stop" | "Ready for scale review";
  reasons: {
    message: string;
    target:
      "measurements" | "thresholds" | "options" | "evidence" | "evaluation";
  }[];
  changes: { field: string; before: number | null; after: number | null }[];
  stale: boolean;
  baselineDiscrepancies: string[];
};
export function rebasePilotDraft(
  e: Engagement,
  o: Opportunity,
  draft: PilotDraft,
): PilotDraft {
  if (e.currency !== draft.forecast.currency)
    throw new Error(
      "Currency changed. Start a new pilot and review monetary inputs; no currency conversion is performed.",
    );
  const fresh = createPilotDraft(e, { ...o, selectedOptionId: draft.optionId });
  const ids = fresh.observations.map((r) => r.taskId);
  if (
    draft.observations.length !== ids.length ||
    draft.observations.some((r) => !ids.includes(r.taskId))
  )
    throw new Error(
      "Task structure changed. Start a new pilot and review task-linked measurements.",
    );
  return pilotDraftSchema.parse({ ...draft, forecast: fresh.forecast });
}
function measurementIssues(p: PilotDraft) {
  const issues: string[] = [];
  const parsed = pilotDraftSchema.safeParse(p);
  if (!parsed.success)
    issues.push(
      ...parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    );
  try {
    const basis = JSON.parse(p.forecast.basis);
    const clean = (option: SolutionOption) =>
      stable({ ...option, simulation: undefined });
    if (
      clean(basis.option) !== clean(p.forecast.option) ||
      clean(basis.bau) !== clean(p.forecast.bau)
    )
      issues.push("Captured forecast disagrees with its financial/task basis");
  } catch {
    issues.push("Captured forecast basis is invalid");
  }
  for (const key of [
    "owner",
    "limitations",
    "source",
    "rationale",
    "startDate",
    "endDate",
  ] as const)
    if (!p[key]?.trim()) issues.push(`${key} is required`);
  if (p.startDate && p.endDate && p.startDate > p.endDate)
    issues.push("Measurement end precedes start");
  for (const key of [
    "eligibleCases",
    "assistedCases",
    "successfulOutcomes",
    "unsafeReleased",
    "budget",
    "nonLabourSpend",
    "otherHumanMinutes",
  ] as const)
    if (p[key] === null) issues.push(`${key} is unknown`);
  if (!p.eligibleCases || !p.assistedCases)
    issues.push("Positive eligible and assisted counts are required");
  if (
    p.assistedCases !== null &&
    p.eligibleCases !== null &&
    p.assistedCases > p.eligibleCases
  )
    issues.push("Assisted cases exceed eligible cases");
  if (
    p.successfulOutcomes !== null &&
    p.assistedCases !== null &&
    p.successfulOutcomes > p.assistedCases
  )
    issues.push("Successful outcomes exceed assisted cases");
  if (
    p.unsafeReleased !== null &&
    p.assistedCases !== null &&
    p.unsafeReleased > p.assistedCases
  )
    issues.push("Unsafe releases exceed assisted cases");
  if (p.thresholds.adoption === null || p.thresholds.successRate === null)
    issues.push("Performance thresholds are required");
  const rows = p.forecast.option.taskPlan?.rows ?? [];
  if (!rows.length || p.observations.length !== rows.length)
    issues.push(
      "Matched timings for every task are required; aggregate cases remain unchanged",
    );
  const seen = new Set<string>();
  for (const r of p.observations) {
    if (!rows.some((t) => t.id === r.taskId) || seen.has(r.taskId))
      issues.push("Missing or duplicate task link");
    seen.add(r.taskId);
    if (!r.sampleCount) issues.push("Positive timed sample count required");
    if (
      r.sampleCount !== null &&
      p.assistedCases !== null &&
      r.sampleCount > p.assistedCases
    )
      issues.push("Timed task sample exceeds assisted cases");
    for (const [key, value] of Object.entries(r))
      if (value === null) issues.push(`${key} is unknown`);
    if (
      r.exceptions !== null &&
      r.sampleCount !== null &&
      r.exceptions > r.sampleCount
    )
      issues.push("Exceptions exceed timed samples");
    if (r.exceptions === 0 && r.exceptionMinutes !== 0)
      issues.push("Zero exceptions require zero exception time");
  }
  return issues;
}
export function assessPilot(
  e: Engagement,
  o: Opportunity,
  p: PilotDraft,
): PilotAssessment {
  const issues = measurementIssues(p),
    option = structuredClone(p.forecast.option);
  const forecast = calculateOption(option, p.forecast.bau);
  const ratio = (a: number | null, b: number | null) =>
    a === null ||
    b === null ||
    b === 0 ||
    !Number.isFinite(a) ||
    !Number.isFinite(b)
      ? null
      : round(new Decimal(a).div(b));
  const metrics: PilotAssessment["metrics"] = {
    adoption: ratio(p.assistedCases, p.eligibleCases),
    successRate: ratio(p.successfulOutcomes, p.assistedCases),
    manualHours: null,
    futureHours: null,
    hoursReleased: null,
    totalCost: null,
    costPerSuccess: null,
  };
  const changes: PilotAssessment["changes"] = [],
    baselineDiscrepancies: string[] = [];
  try {
    if (!issues.length && option.taskPlan) {
      changes.push({
        field: "adoption",
        before: option.inputs.adoption,
        after: metrics.adoption,
      });
      option.inputs.adoption = metrics.adoption;
      // Reset sensitivity scaling: measured handling is the new reference, not a second time-saving multiplier.
      option.taskPlan.referenceReduction = option.inputs.reduction ?? 0;
      let manual = new Decimal(0),
        future = new Decimal(0);
      for (const r of p.observations) {
        const task = option.taskPlan.rows.find((t) => t.id === r.taskId)!;
        const measured = {
          remainingMinutes: ratio(r.handlingMinutes, r.sampleCount)!,
          reviewMinutes: ratio(r.reviewMinutes, r.sampleCount)!,
          exceptionRate: ratio(r.exceptions, r.sampleCount)!,
          exceptionMinutes:
            r.exceptions === 0 ? 0 : ratio(r.exceptionMinutes, r.exceptions)!,
        };
        for (const [field, value] of Object.entries(measured)) {
          const k = field as keyof typeof measured;
          changes.push({
            field: `tasks.${task.id}.${field}`,
            before: task[k],
            after: value,
          });
          task[k] = value;
        }
        const baseline = ratio(r.manualMinutes, r.sampleCount);
        if (baseline !== task.currentMinutes)
          baselineDiscrepancies.push(
            `${task.name}: timed manual mean ${baseline} min versus saved baseline ${task.currentMinutes} min. Review separately; the shared baseline is unchanged.`,
          );
        manual = manual.plus(r.manualMinutes!);
        future = future
          .plus(r.handlingMinutes!)
          .plus(r.reviewMinutes!)
          .plus(r.exceptionMinutes!);
      }
      metrics.manualHours = round(manual.div(60));
      metrics.futureHours = round(future.div(60));
      metrics.hoursReleased = round(manual.minus(future).div(60));
      if (option.inputs.hourlyCost !== null) {
        metrics.totalCost = round(
          future
            .plus(p.otherHumanMinutes!)
            .div(60)
            .times(option.inputs.hourlyCost)
            .plus(p.nonLabourSpend!),
          2,
        );
        metrics.costPerSuccess = p.successfulOutcomes
          ? round(new Decimal(metrics.totalCost).div(p.successfulOutcomes), 2)
          : null;
      }
    } else {
      option.inputs.adoption = null; // Unknown pilot timings cannot produce forecast-as-observation.
    }
  } catch (error) {
    issues.push(
      error instanceof Error ? error.message : "Pilot calculation failed",
    );
    option.inputs.adoption = null;
    changes.length = 0;
    metrics.manualHours =
      metrics.futureHours =
      metrics.hoursReleased =
      metrics.totalCost =
      metrics.costPerSuccess =
        null;
  }
  const projected = calculateOption(option, p.forecast.bau);
  const application = o.pilotApplications?.find(
    (a) => a.pilotId === (p as PilotRevision).id,
  );
  const stale =
    e.currency !== p.forecast.currency ||
    pilotBasis(o, p.optionId) !== (application?.basisAfter ?? p.forecast.basis);
  const assessment = assessOpportunity(e, {
    ...o,
    options: o.options.map((x) => (x.id === p.optionId ? option : x)),
    selectedOptionId: p.optionId,
  });
  const gate = evaluationGate(
    o,
    o.options.find((x) => x.id === p.optionId) ?? option,
  );
  const reasons: PilotAssessment["reasons"] = [];
  const add = (
    message: string,
    target: PilotAssessment["reasons"][number]["target"],
  ) => reasons.push({ message, target });
  let disposition: PilotAssessment["disposition"];
  const policy = o.decisionPolicy ?? {
    objective: "economic",
    npvHurdle: o.economicHurdle,
    paybackCeiling: 24,
  };
  const value = policy.objective === "cash" ? projected.cashNpv : projected.npv;
  const payback =
    policy.objective === "cash"
      ? projected.cashPaybackMonths
      : projected.paybackMonths;
  if ((p.unsafeReleased ?? 0) > 0 || gate.unsafe) {
    disposition = "Stop";
    add(
      "Unsafe output released: stop and investigate the failed control.",
      "evaluation",
    );
  } else if (
    issues.length ||
    projected.status !== "complete" ||
    metrics.costPerSuccess === null ||
    stale
  ) {
    disposition = "Investigate";
    [...issues, ...projected.issues].forEach((message) =>
      add(message, "measurements"),
    );
    if (metrics.costPerSuccess === null)
      add("Cost per successful outcome is not calculable.", "measurements");
    if (stale)
      add(
        "Financial/task basis changed. Create a fresh pilot preview; historical projection remains preserved.",
        "options",
      );
  } else if (
    (metrics.hoursReleased ?? 0) < 0 ||
    (projected.annualHoursSaved ?? 0) < 0 ||
    value! < Math.max(0, policy.npvHurdle) ||
    payback === null ||
    payback > policy.paybackCeiling ||
    metrics.totalCost! > p.budget! ||
    (o.budgetCeiling !== null &&
      projected.investment! + (projected.subsequentInvestment ?? 0) >
        o.budgetCeiling)
  ) {
    disposition = "Fix";
    if (metrics.hoursReleased! < 0 || projected.annualHoursSaved! < 0)
      add(
        "Human workload increases; review effort outweighs time released.",
        "measurements",
      );
    if (
      value! < Math.max(0, policy.npvHurdle) ||
      payback === null ||
      payback > policy.paybackCeiling
    )
      add(
        "Pilot-informed returns fail the selected NPV or payback hurdle.",
        "options",
      );
    if (metrics.totalCost! > p.budget!)
      add("Recorded pilot cost exceeds the pilot budget.", "thresholds");
    if (
      o.budgetCeiling !== null &&
      projected.investment! + (projected.subsequentInvestment ?? 0) >
        o.budgetCeiling
    )
      add("Scheduled investment exceeds the engagement ceiling.", "options");
  } else {
    if (
      metrics.adoption! < p.thresholds.adoption! ||
      metrics.successRate! < p.thresholds.successRate!
    )
      add("Adoption or reviewed-success threshold is not met.", "thresholds");
    if (
      assessment.outcome !== "Recommend investment" ||
      assessment.blockers.length ||
      option.readiness?.validationRequired ||
      gate.needsReview ||
      o.questions?.some((q) => q.unresolved)
    ) {
      assessment.blockers.forEach((b) =>
        add(
          b.message,
          b.section === "evaluation"
            ? "evaluation"
            : b.section === "evidence"
              ? "evidence"
              : "options",
        ),
      );
      add(
        "Existing evidence, adoption, discovery and evaluation gates must be resolved separately; pilot results never clear them automatically.",
        "evidence",
      );
    }
    disposition = reasons.length ? "Extend pilot" : "Ready for scale review";
    if (!reasons.length)
      add(
        "Entered thresholds and current readiness gates pass. Sponsor review is still required; this is not spending approval.",
        "thresholds",
      );
  }
  return {
    metrics,
    forecast,
    projected,
    disposition,
    reasons,
    changes,
    stale,
    baselineDiscrepancies,
  };
}
export function savePilotRevision(
  o: Opportunity,
  draft: PilotDraft,
): Opportunity {
  const input = pilotDraftSchema.parse(draft);
  if (pilotBasis(o, input.optionId) !== input.forecast.basis)
    throw new Error(
      "Pilot financial/task basis changed. Create a new preview before saving.",
    );
  const issues = measurementIssues(input);
  if (issues.length) throw new Error(issues.join("; "));
  const next = structuredClone(o);
  next.pilots = [
    ...(next.pilots ?? []),
    pilotRevisionSchema.parse({
      ...input,
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
    }),
  ];
  return next;
}
export function applyPilotFindings(
  o: Opportunity,
  pilotId: string,
  expectedBasis: string,
  review: {
    owner: string;
    rationale: string;
    confidence: "low" | "medium" | "high";
  },
): Opportunity {
  const p = o.pilots?.find((x) => x.id === pilotId);
  if (!p) throw new Error("Saved pilot not found.");
  if (o.pilotApplications?.some((a) => a.pilotId === pilotId))
    throw new Error(
      "This pilot is already applied. Save a new reviewed revision for further updates.",
    );
  if (!review.owner.trim() || !review.rationale.trim())
    throw new Error("An explicit owner and review rationale are required.");
  if (
    expectedBasis !== p.forecast.basis ||
    pilotBasis(o, p.optionId) !== expectedBasis
  )
    throw new Error(
      "Pilot basis changed; stale findings cannot be applied. Create a new preview.",
    );
  const e = { currency: p.forecast.currency } as Engagement;
  const a = assessPilot(e, o, p);
  if (!a.changes.length || a.projected.status !== "complete")
    throw new Error("Complete valid pilot measurements are required.");
  const next = structuredClone(o),
    option = next.options.find((x) => x.id === p.optionId)!;
  const at = new Date().toISOString(),
    evidenceId = crypto.randomUUID();
  next.evidence.push({
    id: evidenceId,
    title: `${p.name} — reviewed synthetic measurements`,
    excerpt: JSON.stringify({
      period: [p.startDate, p.endDate],
      counts: [p.eligibleCases, p.assistedCases, p.successfulOutcomes],
      observations: p.observations,
      limitations: p.limitations,
    }),
    source: p.source,
    locator: `Pilot revision ${p.id}`,
    date: p.endDate,
    status: "accepted",
    reviewRationale: review.rationale.trim(),
    reviewedAt: at,
    version: 1,
    internalNote: "",
  });
  for (const c of a.changes) {
    if (c.field === "adoption") option.inputs.adoption = c.after;
    else {
      const [, taskId, field] = c.field.split(".");
      const task = option.taskPlan!.rows.find((t) => t.id === taskId)!;
      task[
        field as
          | "remainingMinutes"
          | "reviewMinutes"
          | "exceptionRate"
          | "exceptionMinutes"
      ] = c.after;
      task.evidenceIds = [...new Set([...task.evidenceIds, evidenceId])];
      task.assumed = false;
    }
    next.assumptions.push({
      id: crypto.randomUUID(),
      optionId: option.id,
      field: c.field,
      value: c.after,
      unit:
        c.field === "adoption" || c.field.endsWith("exceptionRate")
          ? "fraction"
          : "minutes",
      provenance: "user_provided",
      confidence: review.confidence,
      evidenceIds: [evidenceId],
      owner: review.owner.trim(),
      version:
        1 +
        Math.max(
          0,
          ...next.assumptions
            .filter((x) => x.optionId === option.id && x.field === c.field)
            .map((x) => x.version),
        ),
      at,
      material: true,
    });
  }
  option.taskPlan!.referenceReduction = option.inputs.reduction ?? 0;
  option.simulation = null;
  next.pilotApplications = [
    ...(next.pilotApplications ?? []),
    {
      id: crypto.randomUUID(),
      pilotId,
      evidenceId,
      at,
      owner: review.owner.trim(),
      rationale: review.rationale.trim(),
      changes: a.changes,
      basisAfter: pilotBasis(next, p.optionId),
    },
  ];
  return next;
}
