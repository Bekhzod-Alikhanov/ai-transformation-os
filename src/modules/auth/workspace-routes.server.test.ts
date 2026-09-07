import { beforeEach, describe, expect, it, vi } from "vitest";

import type { WorkspaceContext } from "./workspace-context";
import { getWorkspaceContext } from "./workspace-context.server";
import { requireWorkspaceCapability } from "./workspace-routes.server";

const navigation = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("next/navigation", () => navigation);

vi.mock("./workspace-context.server", () => ({
  getWorkspaceContext: vi.fn(),
}));

describe("requireWorkspaceCapability", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects an unresolved workspace before protected content renders", async () => {
    vi.mocked(getWorkspaceContext).mockResolvedValue(null);

    await expect(requireWorkspaceCapability("opportunities")).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(navigation.redirect).toHaveBeenCalledWith("/auth/sign-in");
  });

  it("does not allow a live workspace to open a demo-only route", async () => {
    vi.mocked(getWorkspaceContext).mockResolvedValue({
      organisationId: "beck-org",
      mode: "live",
      displayName: "Beck",
      role: "owner",
      capabilities: ["overview", "opportunities"],
    });

    await expect(requireWorkspaceCapability("pilots")).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(navigation.notFound).toHaveBeenCalledOnce();
  });

  it("returns a workspace that owns the requested capability", async () => {
    const workspace: WorkspaceContext = {
      organisationId: "demo-org",
      mode: "synthetic_replay",
      displayName: "Demo operator",
      role: "owner",
      capabilities: ["overview", "pilots"],
    };
    vi.mocked(getWorkspaceContext).mockResolvedValue(workspace);

    await expect(requireWorkspaceCapability("pilots")).resolves.toEqual(
      workspace,
    );
    expect(navigation.redirect).not.toHaveBeenCalled();
    expect(navigation.notFound).not.toHaveBeenCalled();
  });
});
