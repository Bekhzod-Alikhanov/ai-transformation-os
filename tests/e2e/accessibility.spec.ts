import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
test("connected decision surfaces have no automated WCAG A/AA violations or page overflow", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/demo");
  await expect(
    page.getByRole("heading", {
      name: "Support Operations Copilot",
      exact: true,
    }),
  ).toBeVisible();
  for (const name of [
    "Decision Overview",
    "Process & Evidence",
    "Investment Comparison",
    "Agent & Evaluation",
    "Pilot & Recommendation",
  ]) {
    await page
      .getByRole("navigation", { name: "Assessment sections" })
      .getByRole("button", { name, exact: true })
      .click();
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
      name,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      name,
    ).toBe(true);
  }
  await page
    .getByRole("button", { name: "Decision Overview", exact: true })
    .click();
  await page.getByRole("button", { name: /Annual hours released/ }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Annual hours released", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close inspector" }).click();
  await expect(
    page.getByRole("button", { name: /Annual hours released/ }),
  ).toBeFocused();
});
