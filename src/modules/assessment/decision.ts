import { assessOpportunity } from "./assessment";
import { calculateOption } from "./economics";
import { evaluationGate } from "./evaluation";
import type { Engagement, Opportunity } from "./types";
export function compareInvestment(e: Engagement, o: Opportunity) {
  const policy = o.decisionPolicy ?? {
    objective: "economic",
    paybackCeiling: 24,
    npvHurdle: o.economicHurdle,
  };
  const bau = o.options.find((x) => x.kind === "bau")!;
  const rank = { bau: 0, rules: 1, assistance: 2, automation: 3 };
  const alternatives = o.options.map((option) => {
    const financial = calculateOption(option, bau);
    const assessment = assessOpportunity(e, {
      ...o,
      selectedOptionId: option.id,
    });
    const value =
      policy.objective === "cash" ? financial.cashNpv : financial.npv;
    const payback =
      policy.objective === "cash"
        ? financial.cashPaybackMonths
        : financial.paybackMonths;
    const blockers: string[] = [...financial.issues];
    const readiness = option.readiness;
    if (readiness?.data === "unknown" || readiness?.technical === "unknown")
      blockers.push("Data or technical suitability is not assessed");
    if (o.criticalControlsOpen || readiness?.controlsOpen)
      blockers.push("Critical controls remain unresolved");
    if (
      financial.investment !== null &&
      o.budgetCeiling !== null &&
      financial.investment + (financial.subsequentInvestment ?? 0) >
        o.budgetCeiling
    )
      blockers.push("Scheduled investment exceeds the budget ceiling");
    if (value !== null && (value < 0 || value < policy.npvHurdle))
      blockers.push("NPV fails the selected value hurdle");
    if (payback === null || payback > policy.paybackCeiling)
      blockers.push("Payback fails the configured ceiling");
    const evaluation = evaluationGate(o, option);
    if (evaluation.unsafe)
      blockers.push("Evaluation released an unsafe output without a control");
    const eligible =
      option.kind !== "bau" &&
      financial.status === "complete" &&
      blockers.length === 0;
    const evidenceReady = assessment.dimensions.evidence === "ready";
    const validation =
      readiness?.validationRequired ||
      readiness?.data === "concern" ||
      readiness?.technical === "concern" ||
      o.adoption !== "ready" ||
      o.feasibility !== "ready" ||
      o.risk !== "ready" ||
      (o.questions ?? []).some((q) => q.unresolved) ||
      evaluation.needsReview;
    return {
      option,
      financial,
      assessment,
      value,
      payback,
      blockers,
      eligible,
      evidenceReady,
      validation: !!validation,
      evaluationStale: evaluation.stale,
    };
  });
  const candidates = alternatives
    .filter((r) => r.eligible)
    .sort(
      (a, b) =>
        b.value! - a.value! || rank[a.option.kind] - rank[b.option.kind],
    );
  const winner = candidates[0];
  const unknown =
    o.feasibility === "unknown" ||
    o.adoption === "unknown" ||
    o.risk === "unknown" ||
    alternatives.some(
      (r) =>
        r.financial.status !== "complete" ||
        (r.option.kind !== "bau" &&
          (r.option.readiness?.data === "unknown" ||
            r.option.readiness?.technical === "unknown")),
    );
  const preferred = winner?.option ?? bau;
  const ai = preferred.kind === "assistance" || preferred.kind === "automation";
  const incompleteEvidence = winner && !winner.evidenceReady;
  const outcome =
    unknown || incompleteEvidence
      ? "Investigate"
      : !winner
        ? "Keep manual / no current investment case"
        : winner.validation
          ? ai
            ? "Pilot AI"
            : "Validate non-AI automation"
          : ai
            ? "Recommend AI investment"
            : "Recommend non-AI automation";
  const reasons = [
    winner
      ? `${preferred.name} has the highest viable ${policy.objective} NPV (${e.currency} ${winner.value!.toFixed(2)}) under the saved assumptions.`
      : "No intervention clears the configured value, budget, payback and control gates.",
    outcome === "Investigate"
      ? "Resolve incomplete material inputs or evidence before treating this preference as a recommendation."
      : winner?.validation
        ? "Financial attractiveness is not authorisation to spend; validate adoption, quality and controls first."
        : "Choose the lowest-complexity option in an exact financial tie.",
  ];
  const reversalConditions = [
    "Lower adoption, more human review or higher operating cost can reverse the ranking.",
    `The selected objective is ${policy.objective} value; capacity value is not cash.`,
    `Investment ceiling: ${o.budgetCeiling ?? "not set"} ${e.currency}; sustained payback ≤ ${policy.paybackCeiling} months.`,
  ];
  return {
    preferredId: preferred.id,
    preferredKind: preferred.kind,
    preferredName: preferred.name,
    outcome,
    alternatives,
    policy,
    reasons,
    reversalConditions,
  };
}
