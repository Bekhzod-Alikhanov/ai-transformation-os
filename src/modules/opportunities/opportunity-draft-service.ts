export type EligibleOpportunityEvidence = {
  id: string;
  organisationId: string;
  claimKey: string;
  claim: string;
  value: unknown;
  sourceName: string;
};

export type OpportunityDraftRecord = {
  id: string;
  organisationId: string;
  title: string;
  problemStatement: string;
  businessUnit: string | null;
  evidenceIds: string[];
  status: "draft" | "merged" | "rejected" | "promoted";
  version: number;
  createdBy: string;
  targetUseCaseId?: string | null;
};

export type CreateOpportunityDraft = Omit<
  OpportunityDraftRecord,
  "status" | "version"
>;

export type OpportunityDraftRepository = {
  readonly organisationId: string;
  loadEligibleEvidence(): Promise<EligibleOpportunityEvidence[]>;
  createDraft(input: CreateOpportunityDraft): Promise<OpportunityDraftRecord>;
  transitionDraft(input: {
    draftId: string;
    expectedVersion: number;
    action: "merge" | "reject" | "promote";
    targetUseCaseId?: string;
    actorId: string;
  }): Promise<OpportunityDraftRecord | null>;
  updateDraft(input: {
    draftId: string;
    expectedVersion: number;
    title: string;
    problemStatement: string;
    businessUnit: string | null;
    evidenceIds: string[];
    actorId: string;
  }): Promise<OpportunityDraftRecord | null>;
};

export class OpportunityDraftService {
  private readonly id: () => string;

  constructor(
    private readonly dependencies: {
      organisationId: string;
      actorId: string;
      repository: OpportunityDraftRepository;
      id?: () => string;
    },
  ) {
    if (
      dependencies.repository.organisationId !== dependencies.organisationId
    ) {
      throw new Error("Repository organisation does not match workspace");
    }
    this.id = dependencies.id ?? crypto.randomUUID;
  }

  async mine() {
    const evidence = await this.dependencies.repository.loadEligibleEvidence();
    const tenantEvidence = evidence.filter(
      (item) => item.organisationId === this.dependencies.organisationId,
    );
    if (!tenantEvidence.length) {
      throw new Error(
        "No accepted conflict-safe evidence is available to mine",
      );
    }
    const first = tenantEvidence[0]!;
    return this.dependencies.repository.createDraft({
      id: this.id(),
      organisationId: this.dependencies.organisationId,
      title: `${first.claimKey.replaceAll(".", " ")} opportunity`,
      problemStatement: first.claim,
      businessUnit: "Operations",
      evidenceIds: tenantEvidence.map((item) => item.id),
      createdBy: this.dependencies.actorId,
    });
  }

  async transition(input: {
    draftId: string;
    expectedVersion: number;
    action: "merge" | "reject" | "promote";
    targetUseCaseId?: string;
  }) {
    if (input.action === "merge" && !input.targetUseCaseId) {
      throw new Error("Merge requires a target use case");
    }
    if (input.action === "reject" && input.targetUseCaseId) {
      throw new Error("Rejected drafts cannot have a target use case");
    }
    const transitioned = await this.dependencies.repository.transitionDraft({
      ...input,
      actorId: this.dependencies.actorId,
    });
    if (!transitioned)
      throw new Error("Opportunity draft was changed elsewhere");
    if (transitioned.organisationId !== this.dependencies.organisationId) {
      throw new Error("Opportunity draft tenant boundary violation");
    }
    return transitioned;
  }

  async update(input: {
    draftId: string;
    expectedVersion: number;
    title: string;
    problemStatement: string;
    businessUnit: string | null;
    evidenceIds: string[];
  }) {
    if (!input.title.trim() || !input.problemStatement.trim()) {
      throw new Error("Draft title and problem statement are required");
    }
    const eligibleIds = new Set(
      (await this.dependencies.repository.loadEligibleEvidence())
        .filter(
          (evidence) =>
            evidence.organisationId === this.dependencies.organisationId,
        )
        .map((evidence) => evidence.id),
    );
    if (
      input.evidenceIds.length === 0 ||
      input.evidenceIds.some((evidenceId) => !eligibleIds.has(evidenceId))
    ) {
      throw new Error("Draft evidence must be accepted and conflict-safe");
    }
    const updated = await this.dependencies.repository.updateDraft({
      ...input,
      actorId: this.dependencies.actorId,
    });
    if (!updated) throw new Error("Opportunity draft was changed elsewhere");
    return assertTenant(updated, this.dependencies.organisationId);
  }
}

function assertTenant(draft: OpportunityDraftRecord, organisationId: string) {
  if (draft.organisationId !== organisationId) {
    throw new Error("Opportunity draft tenant boundary violation");
  }
  return draft;
}
