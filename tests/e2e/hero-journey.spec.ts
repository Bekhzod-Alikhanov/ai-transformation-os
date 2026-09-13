import { expect, test } from "@playwright/test";
test("support case: evidence, economics, evaluation, setback, decision and current export survive reload", async ({
  page,
}) => {
  await page.goto("/demo");
  await expect(page.locator('[data-replay-ready="true"]')).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Engagement workspace" });
  await nav.getByRole("button", { name: "Evidence", exact: true }).click();
  await page.getByRole("button", { name: /Adoption needs validation/ }).click();
  await page
    .getByLabel("Review rationale")
    .fill(
      "Use 70% as a pilot hypothesis; weekly adoption reviews will validate it.",
    );
  await page.getByRole("button", { name: "Accept evidence" }).click();
  await nav.getByRole("button", { name: "Business case", exact: true }).click();
  await page.getByLabel("Initial investment", { exact: true }).fill("40000");
  await page.getByRole("button", { name: "Save assumptions" }).click();
  await expect(
    page.getByText(
      "Assumptions saved. Prior recommendations now require reassessment.",
    ),
  ).toBeVisible();
  await nav
    .getByRole("button", { name: "Solution & evaluation", exact: true })
    .click();
  await page.getByRole("button", { name: "Run evaluation" }).click();
  await expect(
    page.getByText("Current evaluation", { exact: true }),
  ).toBeVisible();
  await nav
    .getByRole("button", { name: "Outcomes & decision", exact: true })
    .click();
  await page.getByRole("button", { name: "Load adoption setback" }).click();
  await page.getByRole("button", { name: "Save measurements" }).click();
  await expect(
    page.getByText(/Adoption is below the scale threshold/).first(),
  ).toBeVisible();
  await page.getByLabel("Decision", { exact: true }).selectOption("Fix");
  await page
    .getByLabel("Decision rationale")
    .fill("Preserve the pilot; quality passes but adoption is only 38%.");
  await page
    .getByLabel("Conditions and next actions")
    .fill(
      "Operations lead to protect training time and review weekly adoption for 30 days.",
    );
  await page.getByLabel("Follow-up date").fill("2026-10-12");
  await page
    .getByRole("button", { name: "Record decision", exact: true })
    .click();
  await expect(page.getByText(/Decision recorded/)).toBeVisible();
  await page.reload();
  await expect(page.locator('[data-replay-ready="true"]')).toBeVisible();
  await nav
    .getByRole("button", { name: "Outcomes & decision", exact: true })
    .click();
  await expect(
    page.getByText(
      "Preserve the pilot; quality passes but adoption is only 38%.",
      { exact: true },
    ),
  ).toBeVisible();
  const briefPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Decision brief", exact: true })
    .click();
  const brief = await briefPromise;
  const stream = await brief.createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString();
  expect(text).toContain("$40,000");
  expect(text).toContain("quality passes but adoption is only 38%");
  const packPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export steering pack" }).click();
  const pack = await packPromise;
  expect(pack.suggestedFilename()).toBe("support-steering-pack.pptx");
  expect(await pack.failure()).toBeNull();
});
test("reporting case recalculates an imported baseline and uncertainty in a worker", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/demo");
  await expect(page.locator('[data-replay-ready="true"]')).toBeVisible();
  await page
    .getByRole("navigation", { name: "Client engagements" })
    .getByRole("button", { name: /Executive reporting/ })
    .click();
  const nav = page.getByRole("navigation", { name: "Engagement workspace" });
  await nav.getByRole("button", { name: "Evidence", exact: true }).click();
  await page
    .getByLabel("Baseline CSV", { exact: true })
    .fill("volume,minutes\n312,160\n312,200");
  await page.getByRole("button", { name: "Apply baseline" }).click();
  await nav.getByRole("button", { name: "Business case", exact: true }).click();
  await expect(
    page.getByLabel("Eligible annual volume", { exact: true }),
  ).toHaveValue("624");
  await page.getByRole("button", { name: "Run uncertainty analysis" }).click();
  await expect(
    page.getByText("10,000 simulated outcomes", { exact: true }),
  ).toBeVisible({ timeout: 60000 });
  await expect(
    page.getByText("Cash-saving subset", { exact: false }).first(),
  ).toBeVisible();
});
