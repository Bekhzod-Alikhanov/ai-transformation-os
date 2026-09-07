import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { OpportunityActions } from "./opportunity-actions";

vi.mock("@/modules/sources/source-upload.client", () => ({
  uploadSourceFile: vi.fn(),
}));

describe("OpportunityActions source consent", () => {
  it("requires both internal/non-regulated acknowledgement and AI-processing consent before upload", async () => {
    const user = userEvent.setup();
    render(<OpportunityActions />);

    const addEvidence = screen.getByRole("button", { name: "Add evidence" });
    const dataAcknowledgement = screen.getByRole("checkbox", {
      name: /internal, non-regulated data/i,
    });
    const aiConsent = screen.getByRole("checkbox", {
      name: /AI processing/i,
    });

    expect(addEvidence).toBeDisabled();
    await user.click(dataAcknowledgement);
    expect(addEvidence).toBeDisabled();
    await user.click(aiConsent);
    expect(addEvidence).toBeEnabled();
  });
});
