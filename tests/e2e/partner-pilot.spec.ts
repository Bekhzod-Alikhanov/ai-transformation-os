import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("pilot draft, reviewed application, original forecast and partner exports survive navigation and reload", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/demo");
  await expect(
    page.getByRole("heading", {
      name: "Support Operations Copilot",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Pilot & Recommendation", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Load target performance" }).click();
  const pilot = page.locator(".aw-pilot");
  await expect(pilot.getByText("Extend pilot", { exact: true })).toBeVisible();
  const original = await page
    .getByRole("region", { name: "Forecast versus pilot projection" })
    .getByRole("row", { name: /Economic NPV/ })
    .locator("td")
    .first()
    .innerText();
  await page.getByLabel("Review total minutes · Prepare response").fill("180");
  await page
    .getByRole("button", { name: "Decision Overview", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pilot & Recommendation", exact: true })
    .click();
  await expect(
    page.getByLabel("Review total minutes · Prepare response"),
  ).toHaveValue("180");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("button", { name: "Load high-review-effort performance" })
    .click();
  await expect(
    page.getByLabel("Review total minutes · Prepare response"),
  ).toHaveValue("180");
  await page
    .getByRole("button", { name: "Save pilot revision", exact: true })
    .click();
  await expect(pilot.getByRole("status")).toContainText("Saved pilot revision");
  await page
    .getByRole("button", {
      name: "Review proposed assumption updates",
      exact: true,
    })
    .click();
  await page.getByLabel("Application owner").fill("Beck");
  await page
    .getByLabel("Application rationale")
    .fill(
      "Reviewed synthetic pilot observations; validate representative results before scale.",
    );
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page
    .getByRole("button", { name: "Apply reviewed changes", exact: true })
    .click();
  await expect(pilot.getByRole("status")).toContainText(
    "Applied with reviewed evidence",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Pilot & Recommendation", exact: true })
    .click();
  await expect(page.locator(".aw-pilot")).toContainText(
    "Applied with reviewed evidence",
  );
  await expect(
    page
      .getByRole("region", { name: "Forecast versus pilot projection" })
      .getByRole("row", { name: /Economic NPV/ })
      .locator("td")
      .first(),
  ).toHaveText(original);
  await page
    .getByRole("button", { name: "Client deliverables", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Partner brief", exact: true }),
  ).toBeVisible();
  for (const format of ["Markdown", "PowerPoint", "Excel"]) {
    const downloading = page.waitForEvent("download");
    await page
      .getByRole("button", { name: `Download ${format}`, exact: true })
      .click();
    const download = await downloading;
    expect(await download.failure()).toBeNull();
    if (format === "Markdown") {
      const stream = await download.createReadStream();
      const chunks = [];
      for await (const chunk of stream!) chunks.push(chunk);
      expect(Buffer.concat(chunks).toString()).toContain(
        "Synthetic target performance",
      );
    }
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("high-review pilot worsens economics and unsafe release takes precedence", async ({
  page,
}) => {
  await page.goto("/demo");
  await page
    .getByRole("button", { name: "Pilot & Recommendation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Load high-review-effort performance" })
    .click();
  await expect(page.locator(".aw-pilot-verdict")).toContainText("Fix");
  await page.getByLabel("Unsafe outcomes released").fill("1");
  await expect(page.locator(".aw-pilot-verdict")).toContainText("Stop");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
