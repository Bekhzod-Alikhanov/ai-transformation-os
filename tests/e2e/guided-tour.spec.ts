import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("tour walks both projects, keeps controls usable and does not modify records", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/demo");
  await expect(page.locator('[data-replay-ready="true"]')).toBeVisible();
  const before = await page.evaluate(() =>
    localStorage.getItem("beck-delivery-workbench:v1"),
  );
  await page.getByRole("button", { name: /Start guided tour/ }).click();
  await page.getByRole("button", { name: "English", exact: true }).click();
  const tour = page.getByRole("region", { name: "Platform tour" });
  const targets = [
    "brief",
    "evidence",
    "options",
    "economics",
    "assumptions",
    "evaluation",
    "delivery",
    "pilot",
    "decision",
    "examples",
  ];
  for (const [index, target] of targets.entries()) {
    await expect(tour.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      String(index + 1),
    );
    await expect(page.locator(`[data-tour="${target}"]`)).toHaveClass(
      /dw-tour-highlight/,
    );
    await expect(tour.getByText("What to show", { exact: true })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (index === 4) {
      await page.getByLabel("Initial investment", { exact: true }).click();
      await page
        .getByLabel("Initial investment", { exact: true })
        .fill("41000");
      await expect(
        page.getByLabel("Initial investment", { exact: true }),
      ).toHaveValue("41000");
      // Leave it unsaved: the tour must not silently apply a form draft.
    }
    if (index === 0 || index === 4 || index === 9) {
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
    }
    if (index < 9)
      await tour.getByRole("button", { name: "Next step" }).click();
  }
  await expect(
    page.getByRole("heading", { name: "Executive Reporting Automation" }),
  ).toBeVisible();
  await tour.getByRole("button", { name: "Finish tour" }).click();
  await expect(tour).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("beck-delivery-workbench:v1"),
    ),
  ).toBe(before);
  await expect(
    page.getByRole("button", { name: /Start guided tour/ }),
  ).toBeFocused();
});

test("pause, manual exploration, previous step and Escape preserve the tour position", async ({
  page,
}) => {
  await page.goto("/demo");
  await expect(page.locator('[data-replay-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: /Start guided tour/ }).click();
  await page.getByRole("button", { name: "Далее", exact: true }).click();
  await page.getByRole("button", { name: "Пауза", exact: true }).click();
  await expect(page.locator(".dw-tour-highlight")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Engagement workspace" })
    .getByRole("button", { name: "Delivery plan", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Продолжить тур", exact: true })
    .click();
  await expect(page.locator('[data-tour="evidence"]')).toHaveClass(
    /dw-tour-highlight/,
  );
  await page.getByRole("button", { name: "Назад", exact: true }).click();
  await expect(page.locator('[data-tour="brief"]')).toHaveClass(
    /dw-tour-highlight/,
  );
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("region", { name: "Тур по платформе" }),
  ).toHaveCount(0);
});
