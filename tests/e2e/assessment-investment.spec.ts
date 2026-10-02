import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { Workspace } from "../../src/modules/assessment/types";
import { createTemplate } from "../../src/modules/assessment/templates";
import { createWorkspace } from "../../src/modules/assessment/model";
async function stored(page: Page): Promise<Workspace> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("beck-assessment-workbench");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    try {
      return await new Promise<Workspace>((resolve, reject) => {
        const r = db
          .transaction("workspace")
          .objectStore("workspace")
          .get("active");
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    } finally {
      db.close();
    }
  });
}
async function options(page: Page) {
  await page
    .getByRole("button", { name: "Investment Comparison", exact: true })
    .click();
}
async function saveBase(page: Page) {
  await page
    .locator("#base-assumptions")
    .getByLabel("Assumption owner")
    .fill("Synthetic analyst");
  await page
    .getByRole("button", { name: "Save base assumptions", exact: true })
    .click();
  await expect(page.locator(".aw-toolbar").getByRole("status")).toContainText(
    "Saved",
  );
}
async function holdNextSave(page: Page) {
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    (window as Window & { assessmentHold?: boolean }).assessmentHold = true;
    IDBObjectStore.prototype.put = function (
      ...args: Parameters<IDBObjectStore["put"]>
    ) {
      IDBObjectStore.prototype.put = original;
      const request = original.apply(this, args);
      const keepAlive = () => {
        const read = this.get("__assessment_test_hold__");
        read.onsuccess = () => {
          if ((window as Window & { assessmentHold?: boolean }).assessmentHold)
            keepAlive();
        };
      };
      keepAlive();
      return request;
    };
  });
}
async function releaseSave(page: Page) {
  await page.evaluate(() => {
    (window as Window & { assessmentHold?: boolean }).assessmentHold = false;
  });
  await expect(page.locator(".aw-toolbar").getByRole("status")).toContainText(
    "Saved",
  );
}

test("pending native saves preserve newer validation and simulation drafts", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/workbench");
  await page.getByRole("button", { name: "Use support template" }).click();
  await page
    .getByRole("button", { name: "Pilot & Recommendation", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Validation owner", exact: true })
    .fill("Saved owner");
  await holdNextSave(page);
  await page.getByRole("button", { name: "Save validation handover" }).click();
  await expect(page.locator(".aw-toolbar").getByRole("status")).toHaveText(
    "Saving…",
  );
  await page
    .getByRole("textbox", { name: "Validation owner", exact: true })
    .fill("New unsaved owner");
  await releaseSave(page);
  await expect(
    page.getByRole("textbox", { name: "Validation owner", exact: true }),
  ).toHaveValue("New unsaved owner");
  expect(
    (await stored(page)).engagements[0].opportunities[0].validation.owner,
  ).toBe("Saved owner");
  await options(page);
  await page.getByText("Seed & triangular ranges", { exact: true }).click();
  await page.getByLabel("Simulation seed", { exact: true }).fill("23");
  await page.getByRole("button", { name: "Run 10,000 draws" }).click();
  await expect(
    page.getByRole("button", { name: "Save simulation summary" }),
  ).toBeVisible({ timeout: 20000 });
  await page.getByLabel("Simulation seed", { exact: true }).fill("67");
  await page.getByRole("button", { name: "Save simulation summary" }).click();
  await expect(
    page.getByText("Saved simulation", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Simulation seed", { exact: true })).toHaveValue(
    "67",
  );
  expect(
    (await stored(page)).engagements[0].opportunities[0].options[2].simulation
      ?.seed,
  ).toBe(23);
  await page.getByRole("button", { name: "Run 10,000 draws" }).click();
  await expect(
    page.getByRole("button", { name: "Save simulation summary" }),
  ).toBeVisible({ timeout: 20000 });
  await holdNextSave(page);
  await page.getByRole("button", { name: "Save simulation summary" }).click();
  await expect(page.locator(".aw-toolbar").getByRole("status")).toHaveText(
    "Saving…",
  );
  await page.getByLabel("Simulation seed", { exact: true }).fill("89");
  await releaseSave(page);
  await expect(page.getByLabel("Simulation seed", { exact: true })).toHaveValue(
    "89",
  );
  expect(
    (await stored(page)).engagements[0].opportunities[0].options[2].simulation
      ?.seed,
  ).toBe(67);
});

test("removed cost provenance remains available as read-only history", async ({
  page,
}) => {
  await page.goto("/workbench");
  await page.getByRole("button", { name: "Use support template" }).click();
  await options(page);
  const cost = (await stored(page)).engagements[0].opportunities[0].options[2]
    .costs[0];
  await page.getByText("Explicit cost lines (8)", { exact: true }).click();
  await page
    .getByRole("button", { name: "Remove cost 1", exact: true })
    .click();
  await saveBase(page);
  await page
    .getByText("Assumption provenance & history", { exact: true })
    .click();
  await page
    .getByLabel("Assumption field")
    .selectOption(`costs.${cost.id}.amount`);
  await expect(
    page.getByRole("button", { name: "Save provenance", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText(/Retired field. Its recorded provenance/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Inspect assumption history", exact: true })
    .click();
  await expect(
    page
      .locator(".aw-inspector:visible, .aw-drawer:visible")
      .getByText("Retired at this revision", { exact: true }),
  ).toBeVisible();
});

for (const kind of ["support", "reporting"] as const)
  test(`${kind} saved option journey through recommendations and backup`, async ({
    page,
  }, info) => {
    await page.goto("/workbench");
    await page.getByRole("button", { name: `Use ${kind} template` }).click();
    await options(page);
    await page
      .getByRole("button", { name: "Human-reviewed AI", exact: true })
      .click();
    if (kind === "reporting")
      await page
        .getByRole("button", {
          name: "Use Human-reviewed AI for recommendation",
          exact: true,
        })
        .click();
    for (const button of await page
      .getByRole("navigation", { name: "Assessment sections" })
      .getByRole("button")
      .all()) {
      expect(
        await button.evaluate((el) => el.getBoundingClientRect().height),
      ).toBeLessThan(85);
    }
    await page.getByLabel("Adoption (%)", { exact: true }).fill("63");
    await saveBase(page);
    await page
      .getByRole("button", {
        name: /^(Process and rules|Rules-based automation)$/,
        exact: true,
      })
      .click();
    await expect(page.getByLabel("Adoption (%)", { exact: true })).toHaveValue(
      "85",
    );
    await page.getByLabel("Adoption (%)", { exact: true }).fill("71");
    await saveBase(page);
    await page
      .getByRole("button", {
        name: /^(AI assistance|Human-reviewed AI)$/,
        exact: true,
      })
      .click();
    await expect(page.getByLabel("Adoption (%)", { exact: true })).toHaveValue(
      "63",
    );
    await page.getByText("Compose a custom scenario", { exact: true }).click();
    await page
      .getByLabel("Scenario name", { exact: true })
      .fill("Trial envelope");
    await page.getByLabel("Override Adoption (%)", { exact: true }).fill("50");
    await page.getByRole("button", { name: "Save custom scenario" }).click();
    await expect(
      page
        .getByLabel("Scenario comparison")
        .locator("option", { hasText: "Trial envelope" }),
    ).toHaveCount(1);
    await page
      .getByLabel("Scenario comparison")
      .selectOption({ label: "Trial envelope" });
    await expect(
      page.getByRole("heading", { name: "What-if results · Trial envelope" }),
    ).toBeVisible();
    const initial = await stored(page);
    expect(
      initial.engagements[0].opportunities[0].options[2].inputs.adoption,
    ).toBe(0.63);
    await page
      .getByRole("button", { name: "Pilot & Recommendation", exact: true })
      .click();
    await expect(
      page.getByText(/What-if scenarios do not change this base/),
    ).toBeVisible();
    await page
      .getByLabel("Recommendation outcome")
      .selectOption("Recommend investment");
    await page
      .getByLabel("Recommendation rationale")
      .fill("Synthetic trial gate");
    await page.getByLabel("Next decision date").fill("2026-12-15");
    await page.getByRole("button", { name: "Record recommendation" }).click();
    await expect(page.locator("#assessment-content .aw-error")).toContainText(
      "Investment is blocked",
    );
    await page.getByLabel("Recommendation outcome").selectOption("Investigate");
    await page.getByRole("button", { name: "Record recommendation" }).click();
    await expect(
      page.getByRole("heading", { name: "Investigate · Current snapshot" }),
    ).toBeVisible();
    await page
      .getByRole("textbox", { name: "Validation stop criteria", exact: true })
      .fill("Stop if reviewed quality falls below 95%.");
    await page
      .getByRole("button", { name: "Save validation handover" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Investigate · Stale snapshot" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Work queue", exact: true }).click();
    await page
      .getByRole("button", { name: "Stale recommendations: 1", exact: true })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Recommendation",
    );
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
    await page.screenshot({
      path: info.outputPath(`recommendation-${kind}-${info.project.name}.png`),
      fullPage: true,
    });
    await options(page);
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
    await page.screenshot({
      path: info.outputPath(`options-${kind}-${info.project.name}.png`),
      fullPage: true,
    });
    await page.reload();
    await page
      .getByRole("button", {
        name:
          kind === "support"
            ? "Support Operations Copilot"
            : "Executive Reporting Automation",
        exact: true,
      })
      .click();
    await options(page);
    await expect(page.getByLabel("Adoption (%)", { exact: true })).toHaveValue(
      "63",
    );
    await page.getByText("Workspace backup / restore", { exact: true }).click();
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download workspace backup", exact: true })
      .click();
    const file = await download;
    await file.saveAs(info.outputPath("investment-backup.json"));
    const saved = await stored(page),
      o = saved.engagements[0].opportunities[0];
    expect(o.options[1].inputs.adoption).toBe(0.71);
    expect(o.options[2].scenarios.at(-1)?.inputPatch.adoption).toBe(0.5);
    expect(o.validation.stopCriteria).toContain("95%");
    expect(o.recommendations[0].opportunity.options[2].inputs.adoption).toBe(
      0.63,
    );
    expect(
      o.recommendations[0].opportunity.validation.stopCriteria,
    ).not.toContain("95%");
    await page
      .getByLabel("Restore workspace backup", { exact: true })
      .setInputFiles(info.outputPath("investment-backup.json"));
    await expect(page.getByText("Validated backup preview")).toBeVisible();
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Confirm workspace restore" })
      .click();
    await expect(page.getByText("Validated backup preview")).toHaveCount(0);
    expect((await stored(page)).engagements).toEqual(saved.engagements);
  });

test("accepted support and explicit risk gate investment without rewriting base values", async ({
  page,
}) => {
  const workspace = createWorkspace(),
    e = createTemplate("support", "legacy_aggregate"),
    o = e.opportunities[0];
  workspace.engagements.push(e);
  o.adoption = "ready";
  o.risk = "unknown";
  o.assumptions.forEach((a) => {
    a.evidenceIds = [o.evidence[0].id];
  });
  o.assumptions.find(
    (a) => a.optionId === o.options[2].id && a.field === "reduction",
  )!.evidenceIds = [o.evidence[0].id, o.evidence[1].id];
  await page.goto("/workbench");
  await page.getByText("Workspace backup / restore", { exact: true }).click();
  await page
    .getByLabel("Restore workspace backup", { exact: true })
    .setInputFiles({
      name: "gate-fixture.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(workspace)),
    });
  await expect(page.getByText("Validated backup preview")).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Confirm workspace restore" }).click();
  await page
    .getByRole("button", { name: "Support operations assessment", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pilot & Recommendation", exact: true })
    .click();
  await expect(page.getByLabel("Risk readiness")).toHaveValue("unknown");
  await page.getByText(/Resolve \d+ blockers/).click();
  await page
    .getByRole("button", { name: "Review evidence", exact: true })
    .click();
  await expect(
    page.getByText("Review status: conflicted", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Review rationale")
    .fill("Reviewed representative synthetic trial");
  await page
    .getByRole("button", { name: "Accept evidence", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pilot & Recommendation", exact: true })
    .click();
  await page.getByLabel("Risk readiness").selectOption("ready");
  await page.getByRole("button", { name: "Save readiness" }).click();
  await page
    .getByLabel("Recommendation outcome")
    .selectOption("Recommend investment");
  await page
    .getByLabel("Recommendation rationale")
    .fill("Accepted support and all readiness gates reviewed");
  await page.getByLabel("Next decision date").fill("2026-12-01");
  await page.getByRole("button", { name: "Record recommendation" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Recommend investment · Current snapshot",
    }),
  ).toBeVisible();
  const saved = (await stored(page)).engagements[0].opportunities[0];
  expect(saved.options[2].inputs).toEqual(o.options[2].inputs);
  expect(saved.recommendations[0].assessment.dimensions.evidence).toBe("ready");
});

test("worker cancellation, stored reproducibility, staleness and option switching", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/workbench");
  await page.getByRole("button", { name: "Use support template" }).click();
  await options(page);
  await page.getByRole("button", { name: "Run 10,000 draws" }).click();
  await page.getByRole("button", { name: "Cancel simulation" }).click();
  await expect(page.getByText("Cancelled. No result was saved.")).toBeVisible();
  await page.getByRole("button", { name: "Run 10,000 draws" }).click();
  await page
    .getByRole("button", {
      name: /^(Process and rules|Rules-based automation)$/,
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Save simulation summary" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", {
      name: /^(AI assistance|Human-reviewed AI)$/,
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Run 10,000 draws" }).click();
  await page.getByRole("button", { name: "Save simulation summary" }).click();
  await expect(
    page.getByText("Saved simulation", { exact: true }),
  ).toBeVisible();
  const first = (await stored(page)).engagements[0].opportunities[0];
  expect(first.options[1].simulation).toBeNull();
  expect(first.options[2].simulation?.draws).toBe(10000);
  await page.getByRole("button", { name: "Run 10,000 draws" }).click();
  await page.getByRole("button", { name: "Save simulation summary" }).click();
  await expect(
    page.getByText("Saved simulation", { exact: true }),
  ).toBeVisible();
  expect(
    (await stored(page)).engagements[0].opportunities[0].options[2].simulation,
  ).toEqual(first.options[2].simulation);
  await page.getByLabel("Adoption (%)", { exact: true }).fill("66");
  await saveBase(page);
  await expect(
    page.getByText("Stale simulation — rerun for current inputs"),
  ).toBeVisible();
});

test("blank inputs remain unknown through exploratory recommendation", async ({
  page,
}) => {
  await page.goto("/workbench");
  await page.getByLabel("New engagement name").fill("Blank investment");
  await page
    .getByRole("button", { name: "Create blank engagement", exact: true })
    .click();
  await page.getByLabel("New opportunity name").fill("Unassessed opportunity");
  await page
    .getByRole("button", { name: "Add opportunity", exact: true })
    .click();
  await options(page);
  await expect(
    page.getByLabel("Annual volume (items/year)", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Run 10,000 draws" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", {
      name: /^(AI assistance|Human-reviewed AI)$/,
      exact: true,
    })
    .click();
  await page.getByLabel("Adoption (%)", { exact: true }).fill("120");
  await page
    .locator("#base-assumptions")
    .getByLabel("Assumption owner")
    .fill("Analyst");
  await page.getByRole("button", { name: "Save base assumptions" }).click();
  await expect(page.locator("#assessment-content .aw-error")).toContainText(
    "adoption",
  );
  await page
    .getByRole("button", { name: "Pilot & Recommendation", exact: true })
    .click();
  await expect(page.getByLabel("Risk readiness")).toHaveValue("unknown");
  await page
    .getByLabel("Recommendation rationale")
    .fill("Baseline collection required");
  await page.getByLabel("Next decision date").fill("2026-12-01");
  await page.getByRole("button", { name: "Record recommendation" }).click();
  await expect(
    page.getByRole("heading", { name: "Investigate · Current snapshot" }),
  ).toBeVisible();
  expect(
    (await stored(page)).engagements[0].opportunities[0].options[2].inputs
      .adoption,
  ).toBeNull();
});
