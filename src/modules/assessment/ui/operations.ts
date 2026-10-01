import { newId } from "../model";
import type { BaselinePreview } from "../imports";
import type { Evidence, Opportunity } from "../types";

export { accents, safeAccent } from "../brand";

export function saveEvidence(
  opportunity: Opportunity,
  input: Evidence,
): Opportunity {
  const next = structuredClone(opportunity);
  const old = next.evidence.find((x) => x.id === input.id);
  const edited = {
    ...input,
    version: (old?.version ?? 0) + 1,
    status: input.source.trim() ? ("pending" as const) : ("missing" as const),
    reviewRationale: "",
    reviewedAt: "",
  };
  if (old) next.evidence[next.evidence.indexOf(old)] = edited;
  else next.evidence.push(edited);
  return next;
}

export function reviewEvidence(
  opportunity: Opportunity,
  id: string,
  status: "accepted" | "rejected" | "conflicted",
  rationale: string,
): Opportunity {
  if (!rationale.trim()) throw new Error("A review rationale is required.");
  const next = structuredClone(opportunity),
    item = next.evidence.find((x) => x.id === id);
  if (!item) throw new Error("Evidence no longer exists.");
  if (!item.source.trim())
    throw new Error("Record a source before reviewing this evidence.");
  Object.assign(item, {
    status,
    reviewRationale: rationale.trim(),
    reviewedAt: new Date().toISOString(),
  });
  return next;
}

export function applyBaseline(
  opportunity: Opportunity,
  preview: BaselinePreview,
  source: string,
  owner: string,
): Opportunity {
  if (
    !preview.valid ||
    preview.annualVolume === null ||
    preview.minutesBefore === null
  )
    throw new Error("A valid baseline preview is required.");
  if (!owner.trim())
    throw new Error("Name the owner responsible for this imported assumption.");
  const next = structuredClone(opportunity),
    evidenceId = newId(),
    at = new Date().toISOString();
  next.evidence.push({
    id: evidenceId,
    title: `Baseline: ${source}`,
    source,
    locator: preview.sourceLocator,
    excerpt: preview.assumptionsSummary,
    date: "",
    status: "pending",
    reviewRationale: "",
    reviewedAt: "",
    version: 1,
    internalNote: "",
  });
  for (const option of next.options) {
    for (const field of ["annualVolume", "minutesBefore"] as const) {
      option.inputs[field] = preview[field];
      const version =
        Math.max(
          0,
          ...next.assumptions
            .filter((a) => a.optionId === option.id && a.field === field)
            .map((a) => a.version),
        ) + 1;
      next.assumptions.push({
        id: newId(),
        optionId: option.id,
        field,
        value: preview[field],
        unit: field === "annualVolume" ? "items/year" : "minutes/item",
        provenance: "user_provided",
        confidence: "low",
        evidenceIds: [evidenceId],
        owner: owner.trim(),
        version,
        at,
        material: true,
      });
    }
  }
  return next;
}
