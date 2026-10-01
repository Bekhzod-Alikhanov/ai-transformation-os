import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  createEngagement,
  createOpportunity,
  reviseEngagement,
} from "../model";
import { Brief } from "./brief";
import { DraftProvider } from "./drafts";
import type { SurfaceProps } from "./surface";

describe("assessment brief", () => {
  it("keeps blanks unknown and preserves unsaved brief edits across record switches", () => {
    const first = createEngagement("First"),
      second = createEngagement("Second");
    const props: SurfaceProps = {
      engagement: first,
      opportunity: null,
      busy: false,
      save: async () => first,
      navigate: () => {},
      inspect: () => {},
    };
    const view = render(
      <DraftProvider>
        <Brief {...props} />
      </DraftProvider>,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Engagement brief" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Client")).toHaveValue("");
    expect(screen.queryByText(/tour/i)).toBeNull();
    fireEvent.change(screen.getByLabelText("Client"), {
      target: { value: "Synthetic Draft" },
    });
    view.rerender(
      <DraftProvider>
        <Brief {...props} engagement={second} />
      </DraftProvider>,
    );
    expect(screen.getByLabelText("Client")).toHaveValue("");
    view.rerender(
      <DraftProvider>
        <Brief {...props} />
      </DraftProvider>,
    );
    expect(screen.getByLabelText("Client")).toHaveValue("Synthetic Draft");
  });
  it("saves through the revision service, requires currency acknowledgement, and keeps process numbers out of economics", async () => {
    let saved = createEngagement("First");
    saved.opportunities.push(createOpportunity("Triage"));
    const props: SurfaceProps = {
      engagement: saved,
      opportunity: saved.opportunities[0],
      busy: false,
      save: async (detail, update) => {
        saved = reviseEngagement(saved, detail, update);
        return saved;
      },
      navigate: () => {},
      inspect: () => {},
    };
    render(
      <DraftProvider>
        <Brief {...props} />
      </DraftProvider>,
    );
    fireEvent.change(screen.getByLabelText("Currency"), {
      target: { value: "GBP" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save brief" }));
    expect(saved.currency).toBe("USD");
    fireEvent.click(screen.getByLabelText(/numbers are not converted/i));
    fireEvent.click(screen.getByRole("button", { name: "Save brief" }));
    await waitFor(() => expect(saved.currency).toBe("GBP"));
    expect(saved.revision).toBe(1);
    expect(saved.opportunities[0].options[0].inputs.annualVolume).toBeNull();
  });
});
