import { render, screen, waitFor } from "@testing-library/react";
import { expect, it } from "vitest";
import { DeliveryWorkbench } from "./workbench";

it("opens the demo without guided-tour controls or a presenter panel", async () => {
  localStorage.clear();
  render(<DeliveryWorkbench />);
  await waitFor(() =>
    expect(document.querySelector('[data-replay-ready="true"]')).not.toBeNull(),
  );
  expect(
    screen.getByRole("heading", { name: "Support Operations Copilot" }),
  ).toBeVisible();
  expect(
    screen.queryByRole("button", { name: /guided tour|Начать тур/i }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("region", { name: /Platform tour|Тур по платформе/i }),
  ).not.toBeInTheDocument();
});
