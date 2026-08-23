import { expect, test } from "@playwright/test";

test("Control Tower previews a scenario without changing the base", async ({
  page,
}) => {
  await page.goto("/decision-room");
  await page
    .getByRole("textbox", { name: "Ask the Control Tower" })
    .fill("Assume labour savings are 30% lower");
  await page.getByRole("button", { name: "Run analysis" }).click();
  await expect(page.getByText("Scenario preview")).toBeVisible();
  await expect(
    page.getByText("$770K risk-adjusted annual value"),
  ).toBeVisible();
  await expect(page.getByText("Base assumptions unchanged")).toBeVisible();
});

test("approval decisions are explicit and connector states are honest", async ({
  page,
}) => {
  await page.goto("/approvals");
  await expect(page.getByText("4 pending actions")).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).first().click();
  await expect(page.getByText("3 pending actions")).toBeVisible();
  await page.goto("/integrations");
  await expect(page.getByText("Enterprise MCP")).toBeVisible();
  await expect(
    page.getByText("Disabled", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("Salesforce")).toBeVisible();
  await expect(page.getByText("Adapter only").first()).toBeVisible();
});
