import type { Engagement, Opportunity, ValidationPlan } from "./types";
import { compareInvestment } from "./decision";
import { evaluationMetrics } from "./evaluation";
export function generateValidation(
  e: Engagement,
  o: Opportunity,
): ValidationPlan {
  const selected = o.options.find((x) => x.id === o.selectedOptionId)!,
    comparison = compareInvestment(e, o),
    result = comparison.alternatives.find(
      (x) => x.option.id === selected.id,
    )!.financial,
    latest = o.evaluations?.filter((r) => r.optionId === selected.id).at(-1),
    failures = latest ? evaluationMetrics(latest) : null;
  return {
    hypotheses: `${selected.name} releases ${result.annualHoursSaved ?? "unknown"} annual human hours without critical control failure. Confirm that released capacity becomes useful work${selected.inputs.cashShare ? " and the documented contractor-cost avoidance is achievable" : "; do not claim cash savings"}.`,
    baseline: `${result.baselineHumanHours ?? "Unknown"} annual manual hours. Establish timed samples by task and exception; ${selected.inputs.annualVolume ?? "unknown"} items/year.`,
    thresholds: `Suggested: adoption ≥ ${Math.round((selected.inputs.adoption ?? 0) * 100)}%; ${comparison.policy.objective} NPV ≥ ${comparison.policy.npvHurdle} ${e.currency}; payback ≤ ${comparison.policy.paybackCeiling} months; zero unsafe outputs released. Validate thresholds with sponsor.`,
    method: `Matched manual / assisted cases with independent human review. Measure handling, review, exceptions and adoption weekly. Test adoption ±10 percentage points and costs +20%.\n${o.requests
      .filter((r) => r.status === "open")
      .map((r) => `${r.question} — owner: ${r.owner || "unassigned"}`)
      .join(
        "\n",
      )}\n${failures ? `Latest evaluation: ${failures.total - failures.correct} classification/calculation failures; ${failures.unsupported} unsupported proposals; ${failures.unsafeReleased} unsafe releases.` : "Run the synthetic evaluation, then design a representative real pilot separately."}`,
    owner: o.validation.owner || e.processOwner,
    budgetCeiling: o.validation.budgetCeiling ?? o.budgetCeiling,
    controls:
      "Human approval of every agent proposal; escalation on unsupported claims; source references; no autonomous external action; local synthetic data only.",
    stopCriteria:
      "Stop if unsafe output escapes review, reviewed effort exceeds manual effort, the budget is exceeded or the selected economic hurdle fails. Reassess at the recorded next decision date.",
  };
}
