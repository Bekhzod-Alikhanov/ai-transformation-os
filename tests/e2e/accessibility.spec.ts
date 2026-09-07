import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("the local Synthetic Replay is keyboard-accessible without serious violations", async ({
  page,
}) => {
  const session = await page.request.post("/api/auth/demo");
  expect(session.ok()).toBeTruthy();
  await page.goto("/demo");
  await expect(page.locator('[data-replay-ready="true"]')).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole("searchbox", { name: "Search local replay" }).focus();
  await expect(
    page.getByRole("searchbox", { name: "Search local replay" }),
  ).toBeFocused();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
});
