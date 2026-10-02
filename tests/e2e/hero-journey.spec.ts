import { expect, test } from "@playwright/test";
test("support: reactive decision, stored replay, validation and reviewed export survive reload", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Support Operations Copilot",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Pilot AI", exact: true }),
  ).toBeVisible();
  const npv = await page.getByTestId("cockpit-npv").textContent();
  await page.getByLabel("Challenge adoption (%)").fill("10");
  await expect(page.getByTestId("cockpit-npv")).not.toHaveText(npv!);
  await expect(
    page.getByText("Preferred:", { exact: false }).first(),
  ).toContainText("Rules-based automation");
  await page.getByRole("button", { name: "Discard challenge" }).click();
  await page
    .getByRole("button", { name: "Agent & Evaluation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Run synthetic support replay" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Stored evaluation · Synthetic Replay" }),
  ).toBeVisible();
  await page.getByText(/Please refund a transaction.*Expected label/).click();
  await expect(
    page.getByText(
      "Policy check blocked unsupported refund promise; human escalation",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Pilot & Recommendation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Generate plan from this case" })
    .click();
  await page.getByRole("button", { name: "Save validation handover" }).click();
  await page
    .getByLabel("Recommendation outcome")
    .selectOption("Validate through pilot");
  await page
    .getByLabel("Recommendation rationale")
    .fill(
      "Pilot the human-reviewed copilot; validate adoption and timed review before investment.",
    );
  await page
    .getByLabel("Recommendation conditions")
    .fill(
      "Human approval and zero unsafe releases; no automatic spending approval.",
    );
  await page.getByLabel("Next decision date").fill("2026-12-01");
  await page
    .getByRole("button", { name: "Record recommendation", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Validate through pilot · Current snapshot",
    }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Pilot & Recommendation", exact: true })
    .click();
  await expect(
    page.getByText(
      "Pilot the human-reviewed copilot; validate adoption and timed review before investment.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Client deliverables", exact: true })
    .click();
  await page.getByLabel("Export basis").selectOption({ index: 1 });
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download Markdown", exact: true })
    .click();
  const download = await downloading,
    stream = await download.createReadStream(),
    chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const brief = Buffer.concat(chunks).toString();
  expect(brief).toContain("Policy check blocked unsupported refund promise");
  expect(brief).toContain("Validate through pilot");
  expect(brief).toContain("Human-reviewed AI");
});
test("reporting: recommends rules and executes a real local variance pipeline", async ({
  page,
}) => {
  await page.goto("/demo");
  await page
    .getByLabel("Engagement", { exact: true })
    .selectOption({ label: "Executive Reporting Automation" });
  await expect(
    page.getByRole("heading", {
      name: "Recommend non-AI automation",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Agent & Evaluation", exact: true })
    .click();
  await page
    .getByLabel("Synthetic reporting CSV")
    .fill("department,actual,budget\nSupport,120,100\nFinance,80,90");
  await page.getByRole("button", { name: "Run local reporting rules" }).click();
  await expect(
    page.getByRole("heading", { name: "Stored evaluation · Local rules" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Preview totals & variances" })
    .click();
  const inspector = page
    .getByRole("complementary", { name: "Inspector" })
    .or(page.getByRole("dialog"));
  await expect(inspector).toContainText('"actual": 200');
  await expect(inspector).toContainText('"variance": 10');
  await page.getByRole("button", { name: "Close inspector" }).click();
  await page
    .getByLabel("Synthetic reporting CSV")
    .fill("department,actual,budget\nSupport,unknown,100");
  await page.getByRole("button", { name: "Run local reporting rules" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "row 2" }).first(),
  ).toBeVisible();
  await page.reload();
  await page
    .getByLabel("Engagement", { exact: true })
    .selectOption({ label: "Executive Reporting Automation" });
  await page
    .getByRole("button", { name: "Agent & Evaluation", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Stored evaluation · Local rules" }),
  ).toBeVisible();
});
