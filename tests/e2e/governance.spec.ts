import { expect, test } from "@playwright/test";
test("public entry and legacy routes open the demo without email", async ({
  page,
}) => {
  for (const path of [
    "/",
    "/auth/sign-in",
    "/opportunities",
    "/portfolio",
    "/integrations",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/demo$/);
    await expect(
      page.getByRole("heading", { name: "Support Operations Copilot" }),
    ).toBeVisible();
    await expect(page.getByLabel("Work email")).toHaveCount(0);
  }
});
test("both project records, reset cancellation and backup recovery work", async ({
  page,
}) => {
  await page.goto("/demo");
  await expect(page.locator('[data-replay-ready="true"]')).toBeVisible();
  const projects = page.getByRole("navigation", { name: "Client engagements" });
  await expect(projects.getByRole("button")).toHaveCount(2);
  await projects.getByRole("button", { name: /Executive reporting/ }).click();
  await expect(
    page.getByRole("heading", { name: "Executive Reporting Automation" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sponsor view", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Is this ready for the next commitment?",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Executive Reporting Automation" }),
  ).toBeVisible();
  const backup = page.waitForEvent("download");
  await page.getByRole("button", { name: "Back up workspace" }).click();
  expect((await backup).suggestedFilename()).toBe("beck-workspace-backup.json");
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await page.getByRole("button", { name: "Confirm reset" }).click();
  await expect(
    page.getByRole("heading", { name: "Support Operations Copilot" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
