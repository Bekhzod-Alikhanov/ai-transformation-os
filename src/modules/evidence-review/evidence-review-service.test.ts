import { describe, expect, it } from "vitest";

import { EvidenceReviewService } from "./evidence-review-service";
import type {
  EvidenceReviewRepository,
  PersistedEvidence,
} from "./evidence-review-repository";
import type { EvidenceCandidate } from "@/modules/sources/source-types";

const organisationId = "organisation-1";
const actorId = "beck-1";

class InMemoryEvidenceReviewRepository implements EvidenceReviewRepository {
  readonly organisationId = organisationId;
  candidates = new Map<string, EvidenceCandidate>([
    [
      "candidate-1",
      {
        id: "candidate-1",
        organisationId,
        ingestionRunId: "run-1",
        sourceItemId: "item-1",
        claimKey: "reporting.cycle_time_hours",
        claim: "Weekly reporting takes eight hours.",
        value: 8,
        unit: "hours",
        confidence: 0.86,
        locator: { type: "text_line" as const, startLine: 4, endLine: 4 },
        status: "pending" as const,
        createdAt: "2026-08-29T12:00:00.000Z",
      },
    ],
  ]);
  evidence: PersistedEvidence[] = [];
  reviews: Array<{ decision: string; resultingEvidenceId: string | null }> = [];

  async getCandidate(candidateId: string) {
    return this.candidates.get(candidateId) ?? null;
  }

  async reviewCandidate(
    input: Parameters<EvidenceReviewRepository["reviewCandidate"]>[0],
  ) {
    const candidate = this.candidates.get(input.candidateId);
    if (!candidate || candidate.organisationId !== this.organisationId)
      return null;
    if (candidate.status !== "pending") return null;

    const inferred: PersistedEvidence | null =
      input.decision === "rejected"
        ? null
        : {
            id: input.evidenceId,
            organisationId,
            sourceItemId: candidate.sourceItemId,
            claimKey: candidate.claimKey,
            claim: candidate.claim,
            value: candidate.value,
            unit: candidate.unit,
            provenance: "ai_inferred",
            confidence: candidate.confidence,
            locator: candidate.locator,
            linkedEvidenceId: null,
            createdBy: actorId,
            createdAt: input.reviewedAt,
          };
    const result: PersistedEvidence | null =
      input.decision !== "edited" || !inferred || !input.editedEvidenceId
        ? inferred
        : {
            ...inferred,
            id: input.editedEvidenceId,
            value: input.editedValue,
            provenance: "user_provided",
            linkedEvidenceId: inferred.id,
          };
    if (inferred) this.evidence.push(inferred);
    if (result && result !== inferred) this.evidence.push(result);
    this.reviews.push({
      decision: input.decision,
      resultingEvidenceId: result?.id ?? null,
    });
    this.candidates.set(candidate.id, {
      ...candidate,
      status: input.decision === "edited" ? "edited" : input.decision,
    });
    return { candidate: this.candidates.get(candidate.id)!, evidence: result };
  }
}

function makeService(repository = new InMemoryEvidenceReviewRepository()) {
  return {
    repository,
    service: new EvidenceReviewService({
      organisationId,
      actorId,
      repository,
      id: (() => {
        let count = 0;
        return () => `evidence-${++count}`;
      })(),
      now: () => "2026-08-29T12:30:00.000Z",
    }),
  };
}

describe("EvidenceReviewService", () => {
  it("accepts a candidate as immutable AI-inferred evidence with its source locator", async () => {
    const { repository, service } = makeService();

    const result = await service.review({
      candidateId: "candidate-1",
      decision: "accepted",
      rationale: "Matches the operations baseline.",
    });

    expect(result.evidence).toMatchObject({
      provenance: "ai_inferred",
      sourceItemId: "item-1",
      claimKey: "reporting.cycle_time_hours",
      locator: { type: "text_line", startLine: 4, endLine: 4 },
    });
    expect(repository.reviews).toEqual([
      { decision: "accepted", resultingEvidenceId: "evidence-1" },
    ]);
    expect(repository.candidates.get("candidate-1")?.status).toBe("accepted");
  });

  it("keeps inferred evidence immutable and links a user-provided edit to it", async () => {
    const { repository, service } = makeService();

    const result = await service.review({
      candidateId: "candidate-1",
      decision: "edited",
      rationale: "Validated against the latest time study.",
      editedValue: 6.5,
    });

    expect(result.evidence).toMatchObject({
      id: "evidence-2",
      value: 6.5,
      provenance: "user_provided",
      linkedEvidenceId: "evidence-1",
    });
    expect(repository.evidence).toMatchObject([
      { id: "evidence-1", value: 8, provenance: "ai_inferred" },
      { id: "evidence-2", value: 6.5, provenance: "user_provided" },
    ]);
  });

  it("preserves a rejection and refuses a stale second review", async () => {
    const { repository, service } = makeService();

    await service.review({
      candidateId: "candidate-1",
      decision: "rejected",
      rationale: "This excerpt describes an exception.",
    });

    await expect(
      service.review({
        candidateId: "candidate-1",
        decision: "accepted",
        rationale: "Retry",
      }),
    ).rejects.toMatchObject({ code: "stale_candidate" });
    expect(repository.reviews).toEqual([
      { decision: "rejected", resultingEvidenceId: null },
    ]);
  });
});
