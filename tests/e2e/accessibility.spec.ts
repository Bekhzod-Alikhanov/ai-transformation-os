import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
test("review and decision surfaces have no WCAG A/AA automated violations", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/demo");
  await expect(page.locator('[data-replay-ready="true"]')).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Engagement workspace" });
  for (const name of [
    "Engagement brief",
    "Evidence",
    "Business case",
    "Solution & evaluation",
    "Delivery plan",
    "Outcomes & decision",
  ]) {
    await nav.getByRole("button", { name, exact: true }).click();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations, name).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      name,
    ).toBe(true);
  }
  await page.getByRole("button", { name: "Reset demo", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Reset demo", exact: true }),
  ).toBeFocused();
});
