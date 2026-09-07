import { render, screen } from "@testing-library/react";
import { expect, vi } from "vitest";

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: vi.fn(),
}));

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import { createSupabaseSubscription, RunEventFeed } from "./run-event-feed";

describe("RunEventFeed", () => {
  it("filters the Realtime channel by both organisation and run before recovery", () => {
    const on = vi.fn().mockReturnThis();
    const subscribe = vi.fn();
    vi.mocked(createSupabaseBrowserClient).mockReturnValue({
      channel: () => ({ on, subscribe }),
      removeChannel: async () => "ok",
    } as never);

    createSupabaseSubscription("organisation-1", "run-1").subscribe({
      onEvent: () => undefined,
      onStatus: () => undefined,
    });

    expect(on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        filter: "organisation_id=eq.organisation-1,run_id=eq.run-1",
      }),
      expect.any(Function),
    );
  });

  it("mounts the controller and presents compact accessible live status", () => {
    const dispose = vi.fn();
    render(
      <RunEventFeed
        controllerFactory={({ onStatus }) => ({
          start: () => onStatus("recovering"),
          dispose,
        })}
        organisationId="organisation-1"
        runId="run-1"
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Recovering live run events",
    );
    expect(screen.getByText("Run activity")).toBeVisible();
  });
});
