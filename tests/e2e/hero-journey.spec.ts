import { expect, test } from "@playwright/test";

test("local Sia replay completes the Support Triage evidence-to-decision journey", async ({
  page,
}) => {
  const session = await page.request.post("/api/auth/demo");
  expect(session.ok()).toBeTruthy();
  await page.goto("/demo");
  await expect(page.locator('[data-replay-ready="true"]')).toBeVisible({
    timeout: 15_000,
  });

  await expect(
    page.getByRole("heading", { name: "Support Triage" }),
  ).toBeVisible();
  await expect(page.getByText(/guided four-minute replay/i)).toBeVisible();
  await page
    .getByRole("searchbox", { name: "Search local replay" })
    .fill("support");
  await page.getByRole("button", { name: "Support Triage · Case" }).click();
  await page.getByRole("button", { name: "Open economics" }).click();
  await expect(page.getByText("Immutable assumption history")).toBeVisible();
  await page
    .getByRole("button", { name: "Run Synthetic Committee Replay" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Synthetic Committee Replay" }),
  ).toBeVisible();
  await expect(page.getByText(/67% complete .* simulated cost/i)).toBeVisible();
  await page.getByRole("button", { name: "Resolve" }).click();
  await page.getByRole("button", { name: "Record Beck decision" }).click();
  await expect(
    page.getByText("Beck approved conditional_go · decision recorded locally"),
  ).toBeVisible();
});

test("local replay reset recovers the stable Support Triage seed", async ({
  page,
}) => {
  const session = await page.request.post("/api/auth/demo");
  expect(session.ok()).toBeTruthy();
  await page.goto("/demo");
  await expect(page.locator('[data-replay-ready="true"]')).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole("button", { name: "Record Beck decision" }).click();
  await expect(
    page.getByText("Beck approved conditional_go · decision recorded locally"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset replay" }).click();
  await expect(
    page.getByText("Stable Synthetic Replay seed restored locally."),
  ).toBeVisible();
  await expect(
    page.getByText("Beck approved conditional_go · decision recorded locally"),
  ).toHaveCount(0);
});
