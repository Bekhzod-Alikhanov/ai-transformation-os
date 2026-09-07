import type {
  CandidateReviewInput,
  EvidenceReviewRepository,
} from "./evidence-review-repository";

export class EvidenceReviewServiceError extends Error {
  constructor(
    readonly code: "candidate_not_found" | "stale_candidate" | "invalid_edit",
    message: string,
  ) {
    super(message);
    this.name = "EvidenceReviewServiceError";
  }
}

type ReviewRequest =
  | {
      candidateId: string;
      decision: "accepted" | "rejected";
      rationale: string;
    }
  | {
      candidateId: string;
      decision: "edited";
      rationale: string;
      editedValue: unknown;
    };

type Dependencies = {
  organisationId: string;
  actorId: string;
  repository: EvidenceReviewRepository;
  id?: () => string;
  now?: () => string;
};

export class EvidenceReviewService {
  private readonly id: () => string;
  private readonly now: () => string;

  constructor(private readonly dependencies: Dependencies) {
    if (
      dependencies.repository.organisationId !== dependencies.organisationId
    ) {
      throw new Error("Repository organisation does not match workspace");
    }
    this.id = dependencies.id ?? crypto.randomUUID;
    this.now = dependencies.now ?? (() => new Date().toISOString());
  }

  async review(request: ReviewRequest) {
    const candidate = await this.requirePendingCandidate(request.candidateId);
    const rationale = request.rationale.trim();
    if (!rationale) {
      throw new EvidenceReviewServiceError(
        "invalid_edit",
        "A review rationale is required",
      );
    }
    const reviewedAt = this.now();
    const input: CandidateReviewInput = {
      candidateId: candidate.id,
      decision: request.decision,
      rationale,
      editedValue:
        request.decision === "edited" ? request.editedValue : undefined,
      evidenceId: this.id(),
      editedEvidenceId: request.decision === "edited" ? this.id() : null,
      reviewedBy: this.dependencies.actorId,
      reviewedAt,
    };
    const reviewed = await this.dependencies.repository.reviewCandidate(input);
    if (!reviewed) {
      throw new EvidenceReviewServiceError(
        "stale_candidate",
        "Candidate was already reviewed",
      );
    }
    if (
      reviewed.candidate.organisationId !== this.dependencies.organisationId
    ) {
      throw new EvidenceReviewServiceError(
        "candidate_not_found",
        "Candidate not found",
      );
    }
    return reviewed;
  }

  private async requirePendingCandidate(candidateId: string) {
    const candidate =
      await this.dependencies.repository.getCandidate(candidateId);
    if (
      !candidate ||
      candidate.organisationId !== this.dependencies.organisationId
    ) {
      throw new EvidenceReviewServiceError(
        "candidate_not_found",
        "Candidate not found",
      );
    }
    if (candidate.status !== "pending") {
      throw new EvidenceReviewServiceError(
        "stale_candidate",
        "Candidate was already reviewed",
      );
    }
    return candidate;
  }
}
