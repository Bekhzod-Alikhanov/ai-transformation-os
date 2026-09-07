import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { EvidenceWorkbench } from "./evidence-workbench";

const candidate = {
  id: "candidate-1",
  sourceName: "Operations baseline.txt",
  sourceStatus: "review_ready" as const,
  claimKey: "reporting.cycle_time_hours",
  claim: "Weekly reporting takes eight hours.",
  value: "8 hours",
  confidence: 0.86,
  locatorLabel: "Lines 4–4",
  sourceExcerpt: "Weekly reporting takes eight hours.",
  createdAt: "2026-08-29T12:00:00.000Z",
};

describe("EvidenceWorkbench", () => {
  it("connects a selected review queue item to its source locator and keeps the review action reachable", async () => {
    const user = userEvent.setup();
    render(<EvidenceWorkbench candidates={[candidate]} conflicts={[]} />);

    await user.click(
      screen.getByRole("button", {
        name: /Weekly reporting takes eight hours/i,
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Evidence desk" }),
    ).toBeVisible();
    expect(screen.getByRole("region", { name: "Source queue" })).toBeVisible();
    expect(
      screen.getByRole("region", { name: "Source canvas" }),
    ).toHaveTextContent("Lines 4–4");
    expect(
      within(screen.getByRole("region", { name: "Source canvas" })).getByText(
        "Weekly reporting takes eight hours.",
      ),
    ).toHaveAttribute("data-trace-active", "true");
    expect(
      screen.getByRole("button", { name: "Accept evidence" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Reject candidate" }),
    ).toBeEnabled();
  });

  it("posts a persisted rejection rather than only changing the local queue", async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetcher);
    render(<EvidenceWorkbench candidates={[candidate]} conflicts={[]} />);

    await user.click(screen.getByRole("button", { name: "Reject candidate" }));

    expect(fetcher).toHaveBeenCalledWith(
      "/api/evidence/candidates/candidate-1/review",
      expect.objectContaining({ method: "POST" }),
    );
    expect(screen.getByText("Review saved")).toBeVisible();
    vi.unstubAllGlobals();
  });

  it("uses a labelled mobile review drawer that closes on Escape and restores focus", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    render(<EvidenceWorkbench candidates={[candidate]} conflicts={[]} />);

    const trigger = screen.getByRole("button", {
      name: "Open review inspector",
    });
    await user.click(trigger);
    expect(
      screen.getByRole("dialog", { name: "Provenance and review" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Accept evidence" }),
    ).toBeEnabled();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    vi.unstubAllGlobals();
  });

  it("persists an accepted-evidence conflict choice with a rationale", async () => {
    const user = userEvent.setup();
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetcher);
    render(
      <EvidenceWorkbench
        candidates={[candidate]}
        conflicts={[
          {
            claimKey: "reporting.cycle_time_hours",
            entries: [
              {
                evidenceId: "11111111-1111-4111-8111-111111111111",
                excerpt: "Eight hours",
                locatorLabel: "Lines 4–4",
                value: "8",
              },
              {
                evidenceId: "22222222-2222-4222-8222-222222222222",
                excerpt: "Six hours",
                locatorLabel: "Lines 9–9",
                value: "6",
              },
            ],
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("radio", { name: /Six hours/i }));
    await user.type(
      screen.getByLabelText("Resolution rationale"),
      "The revised source is more recent.",
    );
    await user.click(screen.getByRole("button", { name: "Resolve conflict" }));

    expect(fetcher).toHaveBeenCalledWith(
      "/api/evidence/conflicts/resolve",
      expect.objectContaining({ method: "POST" }),
    );
    expect(screen.getByText("Conflict resolution saved")).toBeVisible();
    vi.unstubAllGlobals();
  });

  it("keeps accepted-evidence conflicts actionable when the candidate queue is empty", async () => {
    const user = userEvent.setup();
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetcher);
    render(
      <EvidenceWorkbench
        candidates={[]}
        conflicts={[
          {
            claimKey: "reporting.cycle_time_hours",
            entries: [
              {
                evidenceId: "11111111-1111-4111-8111-111111111111",
                excerpt: "Eight hours",
                locatorLabel: "Lines 4–4",
                value: "8",
              },
              {
                evidenceId: "22222222-2222-4222-8222-222222222222",
                excerpt: "Six hours",
                locatorLabel: "Lines 9–9",
                value: "6",
              },
            ],
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("radio", { name: /Six hours/i }));
    await user.type(
      screen.getByLabelText("Resolution rationale"),
      "The revised source is more recent.",
    );
    await user.click(screen.getByRole("button", { name: "Resolve conflict" }));

    expect(fetcher).toHaveBeenCalledWith(
      "/api/evidence/conflicts/resolve",
      expect.objectContaining({ method: "POST" }),
    );
    expect(screen.getByText("Conflict resolution saved")).toBeVisible();
    vi.unstubAllGlobals();
  });
});
