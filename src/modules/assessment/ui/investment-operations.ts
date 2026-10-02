import { materialFields } from "../assessment";
import { newId } from "../model";
import { shareTaskBaseline } from "../tasks";
import {
  solutionOptionSchema,
  simulationSummarySchema,
  type AssumptionRevision,
  type Opportunity,
  type SolutionOption,
  type SimulationSummary,
  type AssessmentResult,
} from "../types";
import type { NavigationTarget } from "./surface";

export type AssumptionMetadata = Pick<
  AssumptionRevision,
  "owner" | "confidence" | "evidenceIds"
>;
export const sharedFields = [
  "annualVolume",
  "minutesBefore",
  "hourlyCost",
  "productiveHours",
  "discountRate",
] as const;
export const inputLabels = {
  annualVolume: "Annual volume (items/year)",
  minutesBefore: "Baseline time (minutes/item)",
  reduction: "Gross time reduction (%)",
  reviewMinutes: "Human review (minutes/item)",
  adoption: "Adoption (%)",
  hourlyCost: "Loaded hourly cost",
  realisation: "Capacity realisation (%)",
  cashShare: "Labour cash share (%)",
  productiveHours: "Productive hours / FTE / year",
  rampMonths: "Ramp (months, 0–12)",
  discountRate: "Annual discount rate (%)",
};
export const fractionFields = new Set([
  "reduction",
  "adoption",
  "realisation",
  "cashShare",
  "discountRate",
]);
function metadataCheck(o: Opportunity, meta: AssumptionMetadata) {
  if (!meta.owner.trim())
    throw new Error("An explicit assumption owner is required.");
  if (meta.evidenceIds.some((id) => !o.evidence.some((e) => e.id === id)))
    throw new Error("Select evidence from this opportunity.");
}
function append(
  o: Opportunity,
  optionId: string,
  field: string,
  value: number | null,
  meta: AssumptionMetadata,
  material = true,
) {
  o.assumptions.push({
    id: newId(),
    optionId,
    field,
    value,
    unit: fractionFields.has(field) ? "fraction" : "model units",
    provenance: "assumed",
    ...meta,
    owner: meta.owner.trim(),
    evidenceIds: [...meta.evidenceIds],
    material,
    version:
      Math.max(
        0,
        ...o.assumptions
          .filter((a) => a.optionId === optionId && a.field === field)
          .map((a) => a.version),
      ) + 1,
    at: new Date().toISOString(),
  });
}
export function saveOption(
  o: Opportunity,
  input: SolutionOption,
  meta: AssumptionMetadata,
  expected?: SolutionOption,
): Opportunity {
  metadataCheck(o, meta);
  const parsed = solutionOptionSchema.parse(input),
    next = structuredClone(o);
  const old = o.options.find((x) => x.id === input.id);
  if (!old) throw new Error("Option no longer exists.");
  const basis = (x: SolutionOption) =>
    JSON.stringify({
      inputs: x.inputs,
      costs: x.costs,
      benefits: x.benefits,
      cashMechanism: x.cashMechanism,
      reviewAllocation: x.reviewAllocation,
      taskPlan: x.taskPlan,
      readiness: x.readiness,
    });
  if (expected && basis(expected) !== basis(old))
    throw new Error(
      "Saved assumptions changed while this draft was retained. Copy any needed edits, discard this base draft, and edit the current assumptions.",
    );
  const target = next.options.find((x) => x.id === input.id)!;
  // Scenarios and simulation have their own save lifecycles; a retained form cannot overwrite them.
  Object.assign(target, {
    ...parsed,
    scenarios: target.scenarios,
    simulation: target.simulation,
  });
  for (const field of sharedFields)
    if (old.inputs[field] !== parsed.inputs[field])
      next.options.forEach((x) => {
        x.inputs[field] = parsed.inputs[field];
      });
  shareTaskBaseline(next.options, target, old);
  for (const candidate of next.options) {
    const previous = materialFields(
      o.options.find((x) => x.id === candidate.id)!,
    );
    const currentFields = materialFields(candidate);
    for (const field of previous)
      if (!currentFields.some((x) => x.field === field.field))
        append(next, candidate.id, field.field, field.value, meta, false);
    for (const field of currentFields)
      if (
        !previous.some(
          (p) => p.field === field.field && p.value === field.value,
        )
      )
        append(next, candidate.id, field.field, field.value, meta);
  }
  return next;
}
export function blockerTarget(
  o: Opportunity,
  b: AssessmentResult["blockers"][number],
): NavigationTarget {
  const assumption = o.assumptions.find((a) => a.id === b.targetId);
  const linked =
    assumption?.evidenceIds.flatMap((id) =>
      o.evidence.filter((e) => e.id === id),
    ) ?? [];
  const source =
    o.evidence.find((e) => e.id === b.targetId)?.id ??
    linked.find((e) => e.status === "conflicted" || e.status === "rejected")
      ?.id ??
    linked.find((e) => e.status !== "accepted")?.id ??
    linked[0]?.id;
  if (b.section === "evidence")
    return {
      opportunityId: o.id,
      section: source ? "evidence" : "options",
      recordId: source ?? b.targetId,
    };
  return {
    opportunityId: o.id,
    section: b.section === "brief" ? "recommendation" : b.section,
    recordId: b.targetId,
  };
}
export function saveProvenance(
  o: Opportunity,
  optionId: string,
  field: string,
  meta: AssumptionMetadata,
): Opportunity {
  metadataCheck(o, meta);
  const next = structuredClone(o),
    option = next.options.find((x) => x.id === optionId);
  const material =
    option && materialFields(option).find((x) => x.field === field);
  if (!material)
    throw new Error("This field is no longer part of the current option.");
  append(next, optionId, field, material.value, meta);
  return next;
}
export function saveSimulation(
  o: Opportunity,
  optionId: string,
  summary: SimulationSummary,
): Opportunity {
  if (o.revision !== summary.inputRevision)
    throw new Error(
      "Inputs or assessment context changed during simulation. Run again against the current revision.",
    );
  const next = structuredClone(o),
    target = next.options.find((x) => x.id === optionId);
  if (!target) throw new Error("Simulation option no longer exists.");
  target.simulation = simulationSummarySchema.parse(summary);
  return next;
}
