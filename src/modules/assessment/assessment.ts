import { calculateOption } from "./economics";
import { evaluationGate } from "./evaluation";
import type {
  AssessmentResult,
  Engagement,
  Opportunity,
  SolutionOption,
} from "./types";

/** Stable field paths used by provenance forms, imports and recommendation policy. */
export function materialFields(
  option: SolutionOption,
): { field: string; value: number | null }[] {
  return [
    ...Object.entries(option.inputs).map(([field, value]) => ({
      field,
      value,
    })),
    ...option.costs.flatMap((c) => [
      { field: `costs.${c.id}.amount`, value: c.amount },
      { field: `costs.${c.id}.startMonth`, value: c.startMonth },
      { field: `costs.${c.id}.endMonth`, value: c.endMonth },
    ]),
    ...option.benefits
      .filter((b) => b.enabled)
      .flatMap((b) => [
        { field: `benefits.${b.id}.annualAmount`, value: b.annualAmount },
        { field: `benefits.${b.id}.cashShare`, value: b.cashShare },
      ]),
    ...(option.taskPlan?.rows ?? []).flatMap((task) =>
      (
        [
          "annualVolume",
          "currentMinutes",
          "eligible",
          "remainingMinutes",
          "reviewMinutes",
          "exceptionRate",
          "exceptionMinutes",
        ] as const
      ).map((field) => ({
        field: `tasks.${task.id}.${field}`,
        value: task[field],
      })),
    ),
  ];
}
export function assessOpportunity(
  engagement: Engagement,
  opportunity: Opportunity,
): AssessmentResult {
  const o = opportunity,
    option = o.options.find((x) => x.id === o.selectedOptionId),
    bau = o.options.find((x) => x.kind === "bau");
  const blockers: AssessmentResult["blockers"] = [],
    reasons: string[] = [];
  const block = (
    message: string,
    section: AssessmentResult["blockers"][number]["section"],
    targetId?: string,
  ) => blockers.push({ message, section, ...(targetId ? { targetId } : {}) });
  const result: AssessmentResult = {
    outcome: "Investigate",
    dimensions: {
      value: "unknown",
      feasibility:
        option?.readiness?.technical === "unknown" ||
        option?.readiness?.data === "unknown"
          ? "unknown"
          : o.feasibility,
      evidence: "ready",
      adoption: o.adoption,
      risk:
        o.criticalControlsOpen || option?.readiness?.controlsOpen
          ? "concern"
          : o.risk,
    },
    blockers,
    reasons,
  };
  if (!option || !bau) {
    block("Choose an option and retain a BAU comparison", "options", o.id);
    return result;
  }
  const financial = calculateOption(option, bau);
  const gate = evaluationGate(o, option),
    run = gate.run;
  const unsafeEvaluation = gate.unsafe;
  const evaluationNeedsReview = gate.needsReview;
  const payback =
    o.decisionPolicy?.objective === "cash"
      ? financial.cashPaybackMonths
      : financial.paybackMonths;
  const paybackFails =
    !!o.decisionPolicy &&
    financial.status === "complete" &&
    (payback === null || payback > o.decisionPolicy.paybackCeiling);
  if (unsafeEvaluation) {
    result.dimensions.risk = "concern";
    block(
      "Evaluation released an unsafe output; resolve controls and rerun",
      "evaluation",
      run?.id ?? option.id,
    );
  } else if (evaluationNeedsReview)
    block(
      "Required evaluation is missing, stale or contains failed cases; validate the appropriate dataset against the current case",
      "evaluation",
      run?.id ?? option.id,
    );
  if (paybackFails)
    block("Payback fails the configured ceiling", "options", option.id);
  if (financial.status !== "complete")
    financial.issues.forEach((issue) => block(issue, "options", option.id));
  else
    result.dimensions.value =
      (o.decisionPolicy?.objective === "cash"
        ? financial.cashNpv!
        : financial.npv!) >= 0 &&
      (o.decisionPolicy?.objective === "cash"
        ? financial.cashNpv!
        : financial.npv!) >= (o.decisionPolicy?.npvHurdle ?? o.economicHurdle)
        ? "ready"
        : "concern";
  let evidenceUnknown = false,
    evidenceAdverse = false;
  for (const candidate of option.id === bau.id ? [option] : [option, bau]) {
    const revisions = o.assumptions.filter((a) => a.optionId === candidate.id);
    const latest = new Map<string, (typeof revisions)[number]>();
    for (const a of revisions) {
      const old = latest.get(a.field);
      if (
        !old ||
        a.version > old.version ||
        (a.version === old.version && a.at > old.at)
      )
        latest.set(a.field, a);
    }
    const fields = materialFields(candidate);
    for (const a of latest.values())
      if (a.material && !fields.some((x) => x.field === a.field))
        fields.push({ field: a.field, value: a.value });
    for (const field of fields) {
      const assumption = latest.get(field.field);
      const evidence =
        assumption?.evidenceIds.map((id) =>
          o.evidence.find((e) => e.id === id),
        ) ?? [];
      const conflicted = evidence.some(
        (e) => e?.status === "conflicted" || e?.status === "rejected",
      );
      const accepted = evidence.some((e) => e?.status === "accepted");
      if (conflicted) {
        evidenceAdverse = true;
        block(
          `${candidate.name}: ${field.field} has conflicted or rejected evidence`,
          "evidence",
          assumption?.id,
        );
      } else if (
        field.value === null ||
        !assumption ||
        assumption.value !== field.value ||
        !accepted
      ) {
        evidenceUnknown = true;
        block(
          `${candidate.name}: ${field.field} needs matching accepted evidence before investment; owned assumptions can support exploratory calculations`,
          "evidence",
          assumption?.id ?? candidate.id,
        );
      }
    }
  }
  result.dimensions.evidence = evidenceAdverse
    ? "concern"
    : evidenceUnknown
      ? "unknown"
      : "ready";
  if (o.feasibility === "unknown")
    block("Feasibility has not been assessed", "brief", o.id);
  if (o.adoption === "unknown")
    block("Adoption readiness has not been assessed", "brief", o.id);
  if (o.risk === "unknown")
    block("Risk and controls readiness has not been assessed", "brief", o.id);
  if (o.criticalControlsOpen || option.readiness?.controlsOpen)
    block("Critical controls remain open", "recommendation", o.id);
  const overBudget =
    o.budgetCeiling !== null &&
    financial.investment !== null &&
    financial.investment + (financial.subsequentInvestment ?? 0) >
      o.budgetCeiling;
  if (overBudget)
    block(
      `Initial investment exceeds the ${engagement.currency} budget ceiling`,
      "options",
      option.id,
    );
  if (
    o.criticalControlsOpen ||
    option.readiness?.controlsOpen ||
    overBudget ||
    unsafeEvaluation
  ) {
    result.outcome = "Defer";
    reasons.push(
      "Resolve critical controls and funding limits before proceeding.",
    );
  } else if (
    financial.status !== "complete" ||
    evidenceUnknown ||
    evidenceAdverse ||
    o.feasibility === "unknown" ||
    o.adoption === "unknown" ||
    o.risk === "unknown" ||
    option.readiness?.technical === "unknown" ||
    option.readiness?.data === "unknown"
  ) {
    result.outcome = "Investigate";
    reasons.push(
      "Resolve unknown inputs and material evidence before making an investment decision.",
    );
  } else if (result.dimensions.value === "concern" || paybackFails) {
    result.outcome = "Reject";
    reasons.push(
      paybackFails
        ? "Sustained payback fails the stated decision constraint."
        : financial.npv! < 0
          ? "The completed case has negative NPV, independently of the configured economic hurdle."
          : "The completed case falls below the economic NPV hurdle.",
    );
  } else if (
    o.feasibility === "concern" ||
    o.adoption === "concern" ||
    o.risk === "concern" ||
    option.readiness?.validationRequired ||
    option.readiness?.technical === "concern" ||
    option.readiness?.data === "concern" ||
    o.questions?.some((q) => q.unresolved) ||
    evaluationNeedsReview
  ) {
    result.outcome = "Validate through pilot";
    reasons.push(
      "Value clears the hurdle, but feasibility, adoption or risk requires validation.",
    );
  } else {
    result.outcome = "Recommend investment";
    reasons.push(
      "The completed case meets the economic hurdle with accepted evidence for material inputs and ready feasibility, adoption and controls.",
    );
  }
  return result;
}
