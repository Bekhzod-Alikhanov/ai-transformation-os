import { z } from "zod";

export const provenanceKinds = [
  "observed",
  "user_provided",
  "ai_inferred",
  "assumed",
  "calculated",
] as const;
export type ProvenanceKind = (typeof provenanceKinds)[number];
export type Confidence = "high" | "medium" | "low";

export type SourceLocator = {
  kind:
    | "page"
    | "spreadsheet_cell"
    | "csv_row"
    | "email_thread"
    | "calendar_event"
    | "text_range";
  value: string;
  label: string;
};

export type EvidenceRef = {
  id: string;
  claimKey: string;
  claim: string;
  provenance: ProvenanceKind;
  confidence: Confidence;
  sourceId?: string;
  locator?: SourceLocator;
  derivedFrom?: string[];
  validAt?: string;
};

const evidenceSchema = z.object({
  id: z.string().min(1),
  claimKey: z.string().min(1),
  claim: z.string().min(1),
  provenance: z.enum(provenanceKinds),
  confidence: z.enum(["high", "medium", "low"]),
  sourceId: z.string().min(1).optional(),
  locator: z
    .object({
      kind: z.enum([
        "page",
        "spreadsheet_cell",
        "csv_row",
        "email_thread",
        "calendar_event",
        "text_range",
      ]),
      value: z.string().min(1),
      label: z.string().min(1),
    })
    .optional(),
  derivedFrom: z.array(z.string().min(1)).optional(),
  validAt: z.string().datetime().optional(),
});

export function createEvidenceRef(input: EvidenceRef): EvidenceRef {
  const evidence = evidenceSchema.parse(input);
  if (
    evidence.provenance === "observed" &&
    (!evidence.sourceId || !evidence.locator)
  ) {
    throw new Error("Observed evidence requires a source locator");
  }
  if (evidence.provenance === "calculated" && !evidence.derivedFrom?.length) {
    throw new Error("Calculated evidence requires derived evidence references");
  }
  return evidence;
}

export function calculateEvidenceCoverage(
  evidence: EvidenceRef[],
  requiredClaims: string[],
) {
  if (requiredClaims.length === 0)
    return { coverage: 1, observedCoverage: 1, missingClaims: [] };
  const supported = new Set(evidence.map((item) => item.claimKey));
  const observed = new Set(
    evidence
      .filter((item) => item.provenance === "observed")
      .map((item) => item.claimKey),
  );
  const missingClaims = requiredClaims.filter((claim) => !supported.has(claim));
  return {
    coverage: Number(
      (
        (requiredClaims.length - missingClaims.length) /
        requiredClaims.length
      ).toFixed(2),
    ),
    observedCoverage: Number(
      (
        requiredClaims.filter((claim) => observed.has(claim)).length /
        requiredClaims.length
      ).toFixed(2),
    ),
    missingClaims,
  };
}
