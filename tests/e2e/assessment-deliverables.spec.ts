import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import ExcelJS from "exceljs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import {
  createWorkspace,
  recordRecommendation,
} from "../../src/modules/assessment/model";
import { createTemplate } from "../../src/modules/assessment/templates";
import { calculateOption } from "../../src/modules/assessment/economics";

const require = createRequire(import.meta.url);
const JSZip = require(
  require.resolve("jszip", { paths: [require.resolve("exceljs")] }),
);

test("saved draft and historical deliverables download locally with matching values", async ({
  page,
}, info) => {
  const workspace = createWorkspace();
  workspace.brand = { name: "Synthetic Studio", accent: "#8b513b" };
  let e = createTemplate("reporting");
  e.currency = "EUR";
  e.client =
    "LOCALCONTENTCANARY / " + "Long fictional organisation name ".repeat(15);
  e.objectives =
    "A deliberately long synthetic objective requiring a visible workbook reference. ".repeat(
      60,
    );
  e.opportunities[0].evidence[0].source =
    "Synthetic long source and locator for review, never a real client source. ".repeat(
      80,
    );
  e.opportunities[0].evidence[0].internalNote = "PRIVATENOTECANARY";
  e = recordRecommendation(e, e.opportunities[0].id, {
    outcome: "Investigate",
    rationale: "Historical synthetic decision",
    conditions: "Validate adoption",
    alternativesRejected: "Rules remain under consideration",
    nextDecisionDate: "2026-12-01",
    strategicException: "",
  });
  const o = e.opportunities[0],
    snapshot = o.recommendations[0];
  const historical = calculateOption(
    snapshot.opportunity.options[2],
    snapshot.opportunity.options[0],
  );
  o.options[2].inputs.adoption = 0.42;
  o.revision++;
  e.client = "CURRENTCONTENTCANARY";
  e.currency = "GBP";
  workspace.engagements.push(e);
  const sent: string[] = [];
  page.on("request", (r) =>
    sent.push(`${r.method()} ${r.url()} ${r.postData() ?? ""}`),
  );
  await page.goto("/workbench");
  await page.getByText("Workspace backup / restore", { exact: true }).click();
  await page
    .getByLabel("Restore workspace backup", { exact: true })
    .setInputFiles({
      name: "synthetic.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(workspace)),
    });
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Confirm workspace restore" }).click();
  await expect(page.getByText("Validated backup preview")).toHaveCount(0);
  await page.getByText("Workspace backup / restore", { exact: true }).click();
  await page.getByRole("button", { name: e.name, exact: true }).click();
  await page.getByLabel("Client", { exact: true }).fill("UNSAVEDCONTENTCANARY");
  await page
    .getByRole("button", { name: "Client deliverables", exact: true })
    .click();
  const preview = page.getByLabel("Investment brief preview", { exact: true });
  await expect(preview).toContainText("CURRENTCONTENTCANARY");
  await expect(preview).not.toContainText("UNSAVEDCONTENTCANARY");
  await expect(preview).not.toContainText("PRIVATENOTECANARY");
  const currentDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download Markdown", exact: true })
    .click();
  const current = await currentDownload;
  expect(current.suggestedFilename()).toMatch(/draft-r1\.md$/);
  await current.saveAs(info.outputPath("current.md"));
  expect(await readFile(info.outputPath("current.md"), "utf8")).toBe(
    await preview.textContent(),
  );
  await page.getByLabel("Export basis").selectOption(snapshot.id);
  await expect(preview).toContainText("Historical synthetic decision");
  await expect(preview).toContainText("EUR");
  await expect(preview).not.toContainText("CURRENTCONTENTCANARY");
  await expect(preview).toContainText("historical snapshot is stale");
  for (const [button, extension] of [
    ["Markdown", "md"],
    ["PowerPoint", "pptx"],
    ["Excel", "xlsx"],
  ]) {
    const promise = page.waitForEvent("download");
    await page
      .getByRole("button", { name: `Download ${button}`, exact: true })
      .click();
    const download = await promise;
    expect(download.suggestedFilename()).toContain("snapshot-r0");
    expect(download.suggestedFilename()).toMatch(
      new RegExp(`\\.${extension}$`),
    );
    await download.saveAs(info.outputPath(`reviewed.${extension}`));
  }
  const brief = await readFile(info.outputPath("reviewed.md"), "utf8");
  expect(brief).toBe(await preview.textContent());
  const book = new ExcelJS.Workbook();
  await book.xlsx.readFile(info.outputPath("reviewed.xlsx"));
  expect(book.getWorksheet("Options")!.getCell("O4").value).toBe(
    historical.npv,
  );
  expect(book.getWorksheet("Options")!.getCell("P4").value).toBe(
    historical.cashNpv,
  );
  expect(book.getWorksheet("Options")!.getCell("O4").numFmt).toContain("EUR");
  const deck = await JSZip.loadAsync(
    await readFile(info.outputPath("reviewed.pptx")),
  );
  const paths = Object.keys(deck.files) as string[];
  expect(
    paths.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)),
  ).toHaveLength(8);
  const xml = (
    await Promise.all(
      paths
        .filter((n) => n.endsWith(".xml"))
        .map((n) => deck.file(n).async("string")),
    )
  ).join("\n");
  expect(xml).toContain("Historical synthetic decision");
  expect(xml).not.toMatch(
    /CURRENTCONTENTCANARY|UNSAVEDCONTENTCANARY|PRIVATENOTECANARY/,
  );
  await page.getByLabel("Include internal notes").check();
  await expect(preview).toContainText("PRIVATENOTECANARY");
  await page.getByLabel("Include internal notes").uncheck();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(sent.filter((r) => /CONTENTCANARY|NOTECANARY/.test(r))).toEqual([]);
  expect(sent.filter((r) => !r.startsWith("GET "))).toEqual([]);
  await page.screenshot({
    path: info.outputPath("deliverables.png"),
    fullPage: true,
  });
});
