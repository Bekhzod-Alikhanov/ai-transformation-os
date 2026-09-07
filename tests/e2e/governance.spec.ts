import { expect, test } from "@playwright/test";

test("demo sessions cannot open legacy workspace surfaces", async ({
  page,
}) => {
  const session = await page.request.post("/api/auth/demo");
  expect(session.ok()).toBeTruthy();

  for (const path of ["/", "/opportunities", "/portfolio", "/integrations"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/demo$/);
    await expect(
      page.getByRole("heading", { name: "Evidence to governed decision" }),
    ).toBeVisible();
  }
});

test("local replay search distinguishes case and use-case records with real category content", async ({
  page,
}) => {
  const session = await page.request.post("/api/auth/demo");
  expect(session.ok()).toBeTruthy();
  await page.goto("/demo");
  await expect(page.locator('[data-replay-ready="true"]')).toBeVisible({
    timeout: 15_000,
  });

  await page
    .getByRole("searchbox", { name: "Search local replay" })
    .fill("support");

  await expect(
    page.getByRole("button", { name: "Support Triage · Case" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("button", { name: "Support Triage · Case" })
      .getByText(
        "Route and prepare support work with evidence-linked human review.",
      ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Support Queue Copilot · Use Case" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("button", { name: "Support Queue Copilot · Use Case" })
      .getByText(
        "Local use case for queue preparation with analyst-controlled escalation.",
      ),
  ).toBeVisible();
});

test("responsive inspector keeps the primary workbench visible across breakpoints", async ({
  page,
}) => {
  const session = await page.request.post("/api/auth/demo");
  expect(session.ok()).toBeTruthy();
  await page.goto("/demo");
  await expect(page.locator('[data-replay-ready="true"]')).toBeVisible({
    timeout: 15_000,
  });

  const viewportWidth = page.viewportSize()?.width ?? 0;
  if (viewportWidth >= 1280) {
    await expect(
      page.getByRole("button", { name: "Open evidence inspector" }),
    ).toHaveCount(0);
  } else {
    await page.getByRole("button", { name: "Open evidence inspector" }).click();
    await expect(
      page.getByRole("button", { name: "Close evidence inspector" }),
    ).toBeVisible();
  }
  await expect(page.getByText("No providers. No database.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Evidence to governed decision" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Support Triage" }),
  ).toBeVisible();
});
