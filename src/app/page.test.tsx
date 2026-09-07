import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { getWorkspaceContext } from "@/modules/auth/workspace-context.server";

import HomePage from "./page";

vi.mock("@/modules/auth/workspace-context.server", () => ({
  getWorkspaceContext: vi.fn(),
}));

vi.mock("@/modules/auth/request-actor", () => ({
  getRequestActor: vi.fn(async () => ({ userId: "beck-1" })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT:/demo");
  }),
}));

describe("HomePage", () => {
  it("presents magic-link sign in when no workspace is resolved", async () => {
    vi.mocked(getWorkspaceContext).mockResolvedValue(null);

    render(await HomePage());

    expect(screen.getByRole("textbox", { name: "Work email" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: /send magic link/i }),
    ).toBeVisible();
    expect(screen.queryByText("$8.4M")).not.toBeInTheDocument();
  });

  it("does not present Aster metrics inside a live workspace", async () => {
    vi.mocked(getWorkspaceContext).mockResolvedValue({
      organisationId: "beck-org",
      mode: "live",
      displayName: "Beck",
      role: "owner",
      capabilities: ["overview"],
    });

    render(await HomePage());

    expect(screen.getByRole("heading", { name: "My Work" })).toBeVisible();
    expect(screen.queryByText("$8.4M")).not.toBeInTheDocument();
  });

  it("redirects a synthetic workspace to the isolated replay", async () => {
    vi.mocked(getWorkspaceContext).mockResolvedValue({
      organisationId: "demo-org",
      mode: "synthetic_replay",
      displayName: "Synthetic Replay",
      role: "owner",
      capabilities: ["overview"],
    });

    await expect(HomePage()).rejects.toThrow("NEXT_REDIRECT:/demo");
  });
});
