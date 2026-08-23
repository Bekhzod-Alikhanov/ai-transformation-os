import { expect, test } from "@playwright/test";

test("no-key Aster replay completes the executive hero path", async ({
  page,
  request,
}) => {
  const session = await request.post("/api/auth/demo");
  expect(session.ok()).toBeTruthy();

  await page.goto("/");
  await expect(page.getByText("$8.4M")).toBeVisible();
  await expect(page.getByText("$1.9M")).toBeVisible();
  await page.getByRole("link", { name: /review opportunity/i }).click();
  await expect(
    page.getByRole("heading", { name: "Client Status Reporting Automation" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Committee" }).click();
  await expect(page.getByText("CFO Red Team")).toBeVisible();
  await page.getByRole("tab", { name: "Blueprint" }).click();
  await expect(page.getByText("Human approval")).toBeVisible();
  await page.getByRole("tab", { name: "Pilot" }).click();
  await expect(page.getByText("90-day pilot plan")).toBeVisible();
});

test("opportunity discovery remains evidence-backed", async ({ page }) => {
  await page.goto("/opportunities");
  await page
    .getByRole("searchbox", { name: "Search opportunities" })
    .fill("regulatory");
  await expect(
    page.getByRole("link", { name: "Regulatory Reporting Assembly" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Client Status Reporting Automation" }),
  ).toBeHidden();
});
