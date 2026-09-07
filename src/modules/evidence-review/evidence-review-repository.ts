import type {
  EvidenceCandidate,
  SourceLocator,
} from "@/modules/sources/source-types";

export type PersistedEvidence = {
  id: string;
  organisationId: string;
  sourceItemId: string;
  claimKey: string;
  claim: string;
  value: unknown;
  unit: string | null;
  provenance: "ai_inferred" | "user_provided";
  confidence: number;
  locator: SourceLocator;
  linkedEvidenceId: string | null;
  createdBy: string;
  createdAt: string;
};

export type CandidateReviewInput = {
  candidateId: string;
  decision: "accepted" | "edited" | "rejected";
  rationale: string;
  editedValue?: unknown;
  evidenceId: string;
  editedEvidenceId: string | null;
  reviewedBy: string;
  reviewedAt: string;
};

export interface EvidenceReviewRepository {
  readonly organisationId: string;
  getCandidate(candidateId: string): Promise<EvidenceCandidate | null>;
  reviewCandidate(input: CandidateReviewInput): Promise<{
    candidate: EvidenceCandidate;
    evidence: PersistedEvidence | null;
  } | null>;
}
