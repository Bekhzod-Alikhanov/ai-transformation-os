import { describe, expect, it, vi } from "vitest";

import { loadMyWorkQueueCounts } from "./my-work-queues.server";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: vi.fn(),
}));

import { createSupabaseServiceClient } from "@/lib/supabase/server";

describe("My Work queue loader", () => {
  it("derives due decisions from actionable organisation decisions rather than expired approvals", async () => {
    const tables: string[] = [];
    const query = {
      eq: () => query,
      in: () => query,
      lt: () => query,
      lte: () => query,
      is: () => query,
      then: (resolve: (value: { count: number }) => unknown) =>
        Promise.resolve(resolve({ count: 0 })),
    };
    vi.mocked(createSupabaseServiceClient).mockReturnValue({
      from: (table: string) => {
        tables.push(table);
        return { select: () => query };
      },
    } as never);

    await loadMyWorkQueueCounts(
      {
        organisationId: "organisation-1",
        mode: "live",
        displayName: "Beck",
        role: "owner",
        capabilities: ["overview"],
      },
      "beck-1",
    );

    expect(tables.filter((table) => table === "decisions")).toHaveLength(1);
    expect(tables.filter((table) => table === "approvals")).toHaveLength(1);
  });
});
