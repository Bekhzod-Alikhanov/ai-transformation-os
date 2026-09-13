import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { DeliveryWorkbench } from "./workbench";
import { STORAGE_KEY } from "./model";

beforeEach(() => localStorage.clear());
describe("guided presentation tour", () => {
  it("opens bilingual presenter guidance and highlights the relevant surface without changing project data", async () => {
    const user = userEvent.setup();
    render(<DeliveryWorkbench />);
    await waitFor(() =>
      expect(
        document.querySelector('[data-replay-ready="true"]'),
      ).not.toBeNull(),
    );
    await user.click(screen.getByRole("button", { name: /Start guided tour/ }));
    const tour = screen.getByRole("region", { name: "Тур по платформе" });
    expect(
      within(tour).getByText("Проблема клиента и цель проекта"),
    ).toBeVisible();
    expect(document.querySelector('[data-tour="brief"]')).toHaveClass(
      "dw-tour-highlight",
    );
    await user.click(within(tour).getByRole("button", { name: "English" }));
    expect(
      screen.getByRole("region", { name: "Platform tour" }),
    ).toHaveTextContent("What to show");
    await user.click(screen.getByRole("button", { name: "Next step" }));
    expect(
      screen.getByRole("heading", { name: "Make the evidence inspectable." }),
    ).toBeVisible();
    expect(document.querySelector('[data-tour="evidence"]')).toHaveClass(
      "dw-tour-highlight",
    );
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("pauses on manual navigation, resumes the same step and restores trigger focus on exit", async () => {
    const user = userEvent.setup();
    render(<DeliveryWorkbench />);
    await waitFor(() =>
      expect(
        document.querySelector('[data-replay-ready="true"]'),
      ).not.toBeNull(),
    );
    const trigger = screen.getByRole("button", { name: /Start guided tour/ });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Далее" }));
    await user.click(
      within(
        screen.getByRole("navigation", { name: "Engagement workspace" }),
      ).getByRole("button", { name: "Delivery plan" }),
    );
    expect(
      screen.getByRole("button", { name: "Продолжить тур" }),
    ).toBeVisible();
    expect(document.querySelector(".dw-tour-highlight")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Продолжить тур" }));
    expect(
      screen.getByRole("heading", { name: "Make the evidence inspectable." }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Закрыть тур" }));
    expect(
      screen.queryByRole("region", { name: "Тур по платформе" }),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
