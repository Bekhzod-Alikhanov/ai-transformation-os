import {
  recommendationSnapshotSchema,
  type Currency,
  type Engagement,
  type Opportunity,
  type SolutionOption,
  type Workspace,
  type RecommendationInput,
} from "./types";
import { assessOpportunity } from "./assessment";

export const newId = () => crypto.randomUUID();
export function createWorkspace(): Workspace {
  return {
    schemaVersion: 2,
    revision: 0,
    engagements: [],
    brand: { name: "Beck", accent: "#2358d5" },
    migration: { confirmed: false, legacyImported: false },
  };
}
export function createEngagement(
  name = "",
  currency: Currency = "USD",
): Engagement {
  return {
    id: newId(),
    name,
    currency,
    client: "",
    sponsor: "",
    processOwner: "",
    lead: "",
    problem: "",
    objectives: "",
    constraints: "",
    assessmentDate: "",
    decisionDeadline: "",
    archived: false,
    revision: 0,
    opportunities: [],
    history: [],
  };
}
export function createOption(kind: SolutionOption["kind"]): SolutionOption {
  return {
    id: newId(),
    kind,
    name: {
      bau: "Business as usual",
      rules: "Process and rules",
      assistance: "AI assistance",
      automation: "Broader automation",
    }[kind],
    inputs: {
      annualVolume: null,
      minutesBefore: null,
      reduction: null,
      reviewMinutes: null,
      adoption: null,
      hourlyCost: null,
      realisation: null,
      cashShare: null,
      productiveHours: null,
      rampMonths: null,
      discountRate: null,
    },
    cashMechanism: "",
    reviewAllocation: "",
    costs: [],
    benefits: [],
    scenarios: [],
    simulation: null,
  };
}
export function createOpportunity(name = ""): Opportunity {
  const options = (["bau", "rules", "assistance", "automation"] as const).map(
    createOption,
  );
  return {
    id: newId(),
    name,
    problem: "",
    revision: 0,
    discovery: {
      process: { notes: "" },
      workload: { notes: "" },
      pain: { notes: "" },
      data: { notes: "" },
      controls: { notes: "" },
      adoption: { notes: "" },
      value: { notes: "" },
    },
    processSteps: [],
    evidence: [],
    requests: [],
    options,
    selectedOptionId: options[0].id,
    assumptions: [],
    recommendations: [],
    legacyDecisions: [],
    validation: {
      hypotheses: "",
      baseline: "",
      thresholds: "",
      method: "",
      owner: "",
      budgetCeiling: null,
      controls: "",
      stopCriteria: "",
    },
    feasibility: "unknown",
    adoption: "unknown",
    risk: "unknown",
    criticalControlsOpen: false,
    economicHurdle: 0,
    budgetCeiling: null,
  };
}
export function duplicateEngagement(engagement: Engagement): Engagement {
  const copy = structuredClone(engagement);
  copy.name = `${copy.name} (copy)`;
  copy.history = [];
  copy.revision = 0;
  copy.opportunities.forEach((o) => {
    o.recommendations = [];
    o.revision = 0;
    o.options.forEach((x) => {
      x.simulation = null;
    });
  });
  copy.id = newId();
  for (const o of copy.opportunities) {
    o.id = newId();
    const ids = new Map<string, string>();
    const reidentify = (value: { id: string }) => {
      const old = value.id;
      value.id = newId();
      ids.set(old, value.id);
    };
    [o.options, o.evidence, o.requests, o.processSteps, o.assumptions].forEach(
      (list) => list.forEach(reidentify),
    );
    for (const option of o.options)
      [option.costs, option.benefits, option.scenarios].forEach((list) =>
        list.forEach(reidentify),
      );
    o.selectedOptionId = ids.get(o.selectedOptionId)!;
    for (const a of o.assumptions) {
      a.optionId = ids.get(a.optionId)!;
      a.evidenceIds = a.evidenceIds.map((id) => ids.get(id)!);
      const parts = a.field.split(".");
      if (
        parts.length === 3 &&
        (parts[0] === "costs" || parts[0] === "benefits")
      ) {
        parts[1] = ids.get(parts[1]) ?? parts[1];
        a.field = parts.join(".");
      }
    }
  }
  return copy;
}
export function reviseEngagement(
  engagement: Engagement,
  detail: string,
  mutate: (draft: Engagement) => void,
): Engagement {
  const draft = structuredClone(engagement);
  mutate(draft);
  draft.revision = engagement.revision + 1;
  const summary = (e: Engagement) => ({
    ...e,
    opportunities: undefined,
    history: undefined,
    revision: undefined,
  });
  // Brief changes affect every recommendation; opportunity edits affect their own revision.
  const briefChanged =
    JSON.stringify(summary(engagement)) !== JSON.stringify(summary(draft));
  const source = (o: Opportunity) => ({
    ...o,
    recommendations: undefined,
    revision: undefined,
    options: o.options.map((option) => ({ ...option, simulation: undefined })),
  });
  draft.opportunities.forEach((o) => {
    const old = engagement.opportunities.find((x) => x.id === o.id);
    if (old)
      o.revision =
        old.revision +
        (briefChanged ||
        JSON.stringify(source(old)) !== JSON.stringify(source(o))
          ? 1
          : 0);
  });
  draft.history.push({
    id: newId(),
    at: new Date().toISOString(),
    detail,
    revision: draft.revision,
  });
  return draft;
}
export function isRecommendationStale(
  opportunity: Opportunity,
  recommendation: Opportunity["recommendations"][number],
): boolean {
  return opportunity.revision !== recommendation.sourceRevision;
}
export function recordRecommendation(
  engagement: Engagement,
  opportunityId: string,
  input: RecommendationInput,
): Engagement {
  const draft = structuredClone(engagement),
    opportunity = draft.opportunities.find((o) => o.id === opportunityId);
  if (!opportunity) throw new Error("Opportunity not found");
  const assessment = assessOpportunity(draft, opportunity);
  if (input.outcome === "Recommend investment") {
    const hardBlock =
      assessment.blockers.some((b) => b.section === "evidence") ||
      assessment.dimensions.risk !== "ready" ||
      assessment.dimensions.value === "unknown" ||
      opportunity.feasibility !== "ready" ||
      opportunity.adoption !== "ready";
    if (hardBlock || assessment.outcome === "Defer")
      throw new Error(
        "Investment is blocked by evidence, controls, budget or readiness",
      );
    if (assessment.outcome === "Reject" && !input.strategicException.trim())
      throw new Error(
        "A strategic exception with rationale is required for negative NPV or value below the economic hurdle",
      );
    if (assessment.outcome === "Reject")
      assessment.reasons.push(
        "Strategic exception: recommendation overrides the adverse economic assessment; calculated value is unchanged.",
      );
  }
  // The snapshot schemas project the brief and opportunity, excluding live history and recursive recommendations.
  const record = recommendationSnapshotSchema.parse({
    ...input,
    id: newId(),
    at: new Date().toISOString(),
    sourceRevision: opportunity.revision,
    assessment,
    engagement: draft,
    opportunity,
  });
  opportunity.recommendations.push(structuredClone(record));
  draft.revision++;
  draft.history.push({
    id: newId(),
    at: record.at,
    detail: `Recorded recommendation: ${input.outcome}`,
    revision: draft.revision,
  });
  return draft;
}
