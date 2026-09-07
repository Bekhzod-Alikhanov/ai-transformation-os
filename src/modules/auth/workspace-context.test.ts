import { createDemoSession } from "./demo-session";
import { resolveRequestActor } from "./request-actor";
import {
  workspaceContextForActor,
  workspaceContextSchema,
} from "./workspace-context";

const secret = "a-secure-demo-secret-that-is-long-enough";

describe("workspace context", () => {
  it("rejects fields outside the strict server-to-client contract", () => {
    const result = workspaceContextSchema.safeParse({
      organisationId: "live-organisation",
      mode: "live",
      displayName: "Beck",
      role: "owner",
      capabilities: ["opportunities"],
      email: "beck@example.com",
    });

    expect(result.success).toBe(false);
  });

  it("gives an authenticated actor precedence over a stale demo cookie", async () => {
    const demoToken = createDemoSession(
      secret,
      1_800_000_000_000,
      "demo-organisation",
    );

    const actor = await resolveRequestActor({
      authenticatedUser: {
        id: "beck-user",
        email: "beck@example.com",
        user_metadata: {},
      },
      demoToken,
      demoSecret: secret,
      now: 1_800_000_000_001,
      isDesignatedPrincipal: () => true,
      resolveExistingMembership: async () => null,
      bootstrap: async () => ({
        organisationId: "live-organisation",
        displayName: "Beck",
        role: "owner",
      }),
    });

    expect(actor).toEqual({
      userId: "beck-user",
      organisationId: "live-organisation",
      displayName: "Beck",
      role: "owner",
      synthetic: false,
    });
  });

  it("does not bootstrap an ordinary authenticated user", async () => {
    const actor = await resolveRequestActor({
      authenticatedUser: {
        id: "ordinary-user",
        email: "ordinary@example.com",
        user_metadata: {},
      },
      demoToken: createDemoSession(
        secret,
        1_800_000_000_000,
        "demo-organisation",
      ),
      demoSecret: secret,
      now: 1_800_000_000_001,
      isDesignatedPrincipal: () => false,
      resolveExistingMembership: async () => null,
      bootstrap: async () => {
        throw new Error("ordinary users must never bootstrap");
      },
    });

    expect(actor).toBeNull();
  });

  it("resolves an ordinary authenticated user only through an existing membership", async () => {
    const actor = await resolveRequestActor({
      authenticatedUser: {
        id: "existing-viewer",
        email: "viewer@example.com",
        user_metadata: {},
      },
      isDesignatedPrincipal: () => false,
      resolveExistingMembership: async () => ({
        organisationId: "live-organisation",
        displayName: "Existing Viewer",
        role: "viewer",
      }),
      bootstrap: async () => {
        throw new Error("existing users must not bootstrap");
      },
    });

    expect(actor?.role).toBe("viewer");
    expect(actor?.organisationId).toBe("live-organisation");
    expect(actor?.synthetic).toBe(false);
  });

  it("maps actors to mode-specific capabilities", () => {
    const live = workspaceContextForActor({
      userId: "beck-user",
      organisationId: "live-organisation",
      displayName: "Beck",
      role: "owner",
      synthetic: false,
    });
    const demo = workspaceContextForActor({
      userId: "demo-user",
      organisationId: "demo-organisation",
      displayName: "Demo Owner",
      role: "owner",
      synthetic: true,
    });

    expect(live.mode).toBe("live");
    expect(live.capabilities).not.toContain("pilots");
    expect(live.capabilities).not.toContain("advanced_process_editing");
    expect(demo.mode).toBe("synthetic_replay");
    expect(demo.capabilities).toContain("pilots");
    expect(demo.capabilities).toContain("advanced_process_editing");
  });
});
