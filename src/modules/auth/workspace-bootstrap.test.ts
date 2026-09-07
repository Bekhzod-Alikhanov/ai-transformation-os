import type { OrganisationRole } from "@/modules/approvals/approval-service";

import {
  bootstrapLiveWorkspace,
  type WorkspaceBootstrapRepository,
} from "./workspace-bootstrap";

class InMemoryWorkspaceRepository implements WorkspaceBootstrapRepository {
  organisations = new Map<string, { id: string; name: string }>();
  profiles = new Map<string, { displayName: string }>();
  memberships = new Map<
    string,
    { organisationId: string; userId: string; role: OrganisationRole }
  >();

  async ensureOrganisation(input: {
    slug: string;
    name: string;
    isDemo: boolean;
  }) {
    const existing = this.organisations.get(input.slug);
    if (existing) return existing;
    const organisation = { id: "live-organisation", name: input.name };
    this.organisations.set(input.slug, organisation);
    return organisation;
  }

  async ensureProfile(input: { userId: string; displayName: string }) {
    const existing = this.profiles.get(input.userId);
    if (existing) return existing;
    const profile = { displayName: input.displayName };
    this.profiles.set(input.userId, profile);
    return profile;
  }

  async findMembership(input: { organisationId: string; userId: string }) {
    const key = `${input.organisationId}:${input.userId}`;
    return this.memberships.get(key) ?? null;
  }

  async createMembership(input: {
    organisationId: string;
    userId: string;
    role: OrganisationRole;
  }) {
    const key = `${input.organisationId}:${input.userId}`;
    this.memberships.set(key, input);
    return input;
  }
}

describe("live workspace bootstrap", () => {
  it("idempotently creates Beck's AI Transformation OS owner membership", async () => {
    const repository = new InMemoryWorkspaceRepository();
    const user = {
      id: "beck-user",
      email: "beck@example.com",
      user_metadata: {},
    };

    const first = await bootstrapLiveWorkspace(repository, user);
    const second = await bootstrapLiveWorkspace(repository, user);

    expect(first).toEqual({
      organisationId: "live-organisation",
      organisationName: "AI Transformation OS",
      displayName: "Beck",
      role: "owner",
    });
    expect(second).toEqual(first);
    expect(repository.organisations.size).toBe(1);
    expect(repository.profiles.size).toBe(1);
    expect(repository.memberships.size).toBe(1);
  });

  it("preserves an existing profile display name", async () => {
    const repository = new InMemoryWorkspaceRepository();
    repository.profiles.set("beck-user", { displayName: "Beck H." });

    const result = await bootstrapLiveWorkspace(repository, {
      id: "beck-user",
      email: "beck@example.com",
      user_metadata: { display_name: "Replacement" },
    });

    expect(result.displayName).toBe("Beck H.");
  });

  it.each(["viewer", "admin"] as const)(
    "preserves an existing %s membership role",
    async (role) => {
      const repository = new InMemoryWorkspaceRepository();
      repository.organisations.set("ai-transformation-os", {
        id: "live-organisation",
        name: "AI Transformation OS",
      });
      repository.memberships.set("live-organisation:beck-user", {
        organisationId: "live-organisation",
        userId: "beck-user",
        role,
      });

      const result = await bootstrapLiveWorkspace(repository, {
        id: "beck-user",
        email: "beck@example.com",
        user_metadata: {},
      });

      expect(result.role).toBe(role);
      expect(
        repository.memberships.get("live-organisation:beck-user")?.role,
      ).toBe(role);
    },
  );
});
