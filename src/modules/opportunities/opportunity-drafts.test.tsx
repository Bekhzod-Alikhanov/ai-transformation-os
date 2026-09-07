import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { OpportunityDrafts } from "./opportunity-drafts";

it("persists an optimistic merge and removes the terminal draft from the live queue", async () => {
  const user = userEvent.setup();
  const fetcher = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ id: "draft-1", status: "merged", version: 2 }),
  });
  vi.stubGlobal("fetch", fetcher);
  render(
    <OpportunityDrafts
      drafts={[
        {
          id: "draft-1",
          title: "Reporting cycle-time opportunity",
          problemStatement: "Weekly reporting takes eight hours.",
          businessUnit: "Operations",
          evidenceIds: ["evidence-1"],
          status: "draft",
          version: 1,
        },
      ]}
      useCases={[{ id: "use-case-1", title: "Reporting automation" }]}
    />,
  );

  await user.selectOptions(screen.getByLabelText("Merge target"), "use-case-1");
  await user.click(screen.getByRole("button", { name: "Merge draft" }));

  expect(fetcher).toHaveBeenCalledWith(
    "/api/opportunities/drafts/draft-1/transition",
    expect.objectContaining({ method: "POST" }),
  );
  expect(
    screen.queryByText("Reporting cycle-time opportunity"),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Draft merged");
  vi.unstubAllGlobals();
});

it("edits draft fields and selected evidence through a versioned persisted update", async () => {
  const user = userEvent.setup();
  const fetcher = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      id: "draft-1",
      title: "Faster reporting",
      problemStatement: "Weekly reporting consumes eight hours.",
      businessUnit: "Finance",
      evidenceIds: ["evidence-1", "evidence-2"],
      status: "draft",
      version: 2,
    }),
  });
  vi.stubGlobal("fetch", fetcher);
  render(
    <OpportunityDrafts
      drafts={[
        {
          id: "draft-1",
          title: "Reporting cycle-time opportunity",
          problemStatement: "Weekly reporting takes eight hours.",
          businessUnit: "Operations",
          evidenceIds: ["evidence-1"],
          status: "draft",
          version: 1,
        },
      ]}
      eligibleEvidence={[
        { id: "evidence-1", claim: "Eight hours", sourceName: "Baseline" },
        { id: "evidence-2", claim: "Six hours", sourceName: "Revision" },
      ]}
      useCases={[]}
    />,
  );

  await user.click(screen.getByRole("button", { name: "Edit draft" }));
  await user.clear(screen.getByLabelText("Draft title"));
  await user.type(screen.getByLabelText("Draft title"), "Faster reporting");
  await user.click(screen.getByRole("checkbox", { name: /Six hours/i }));
  await user.click(screen.getByRole("button", { name: "Save draft changes" }));

  expect(fetcher).toHaveBeenCalledWith(
    "/api/opportunities/drafts/draft-1",
    expect.objectContaining({ method: "PATCH" }),
  );
  expect(screen.getByRole("status")).toHaveTextContent("Draft saved");
  expect(refresh).toHaveBeenCalledOnce();
  vi.unstubAllGlobals();
});

it("clears a selected merge target before persisting rejection", async () => {
  const user = userEvent.setup();
  const fetcher = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ id: "draft-1", status: "rejected", version: 2 }),
  });
  vi.stubGlobal("fetch", fetcher);
  render(
    <OpportunityDrafts
      drafts={[
        {
          id: "draft-1",
          title: "Reporting cycle-time opportunity",
          problemStatement: "Weekly reporting takes eight hours.",
          businessUnit: "Operations",
          evidenceIds: ["evidence-1"],
          status: "draft",
          version: 1,
        },
      ]}
      useCases={[{ id: "use-case-1", title: "Reporting automation" }]}
    />,
  );

  await user.selectOptions(screen.getByLabelText("Merge target"), "use-case-1");
  await user.click(screen.getByRole("button", { name: "Reject draft" }));

  expect(fetcher).toHaveBeenCalledWith(
    "/api/opportunities/drafts/draft-1/transition",
    expect.objectContaining({
      body: JSON.stringify({ action: "reject", expectedVersion: 1 }),
    }),
  );
  vi.unstubAllGlobals();
});
