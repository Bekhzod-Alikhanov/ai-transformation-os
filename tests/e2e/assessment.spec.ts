import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  seedWorkspace,
  STORAGE_KEY,
} from "../../src/modules/delivery-workbench/model";
import {
  createWorkspace,
  createEngagement,
  recordRecommendation,
} from "../../src/modules/assessment/model";
import { createTemplate } from "../../src/modules/assessment/templates";
import type { Workspace } from "../../src/modules/assessment/types";
import ExcelJS from "exceljs";

async function blank(page: Page) {
  await page.goto("/workbench");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Start an assessment",
  );
  await page.getByLabel("New engagement name").fill("Synthetic assessment");
  await page
    .getByRole("button", { name: "Create blank engagement", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Saved");
}
async function stored(page: Page) {
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

test("malformed historical snapshot restore retains the healthy saved revision and usable history", async ({
  page,
}) => {
  const workspace = createWorkspace();
  const engagement = createTemplate("reporting");
  workspace.engagements.push(
    recordRecommendation(engagement, engagement.opportunities[0].id, {
      outcome: "Investigate",
      rationale: "Healthy historical synthetic recommendation",
      conditions: "Validate baseline",
      alternativesRejected: "Rules remain under consideration",
      nextDecisionDate: "2026-12-01",
      strategicException: "",
    }),
  );
  await page.goto("/workbench");
  await page.getByText("Workspace backup / restore", { exact: true }).click();
  const input = page.getByLabel("Restore workspace backup", { exact: true });
  await input.setInputFiles({
    name: "healthy.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(workspace)),
  });
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Confirm workspace restore" }).click();
  await expect(page.getByText("Validated backup preview")).toHaveCount(0);
  const healthy = await stored(page);
  const malformed = structuredClone(healthy);
  malformed.engagements[0].opportunities[0].recommendations[0].opportunity.selectedOptionId =
    "missing-historical-option";
  await page.getByText("Workspace backup / restore", { exact: true }).click();
  await input.setInputFiles({
    name: "malformed-history.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(malformed)),
  });
  await expect(
    page.getByRole("alert").filter({ hasText: "Backup validation failed" }),
  ).toContainText(
    /nothing was restored.*Selected option missing.*Keep the original backup/i,
  );
  await expect(
    page.getByRole("button", { name: "Confirm workspace restore" }),
  ).toHaveCount(0);
  expect(await stored(page)).toEqual(healthy);
  await page.reload();
  await page
    .getByRole("button", { name: engagement.name, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pilot & Recommendation", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Immutable recommendation history" }),
  ).toBeVisible();
  await expect(
    page.getByText("Healthy historical synthetic recommendation", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Inspect recorded snapshot",
      exact: true,
    }),
  ).toBeVisible();
  expect(await stored(page)).toEqual(healthy);
});

test("blank engagement to imported and reviewed evidence persists in native IndexedDB", async ({
  page,
}) => {
  const sent: string[] = [];
  page.on("request", (request) => {
    sent.push(request.url() + (request.postData() ?? ""));
  });
  await blank(page);
  await page.getByLabel("New opportunity name").fill("Synthetic routing");
  await page
    .getByRole("button", { name: "Add opportunity", exact: true })
    .click();
  await page.getByLabel("Client").fill("LOCAL-CONTENT-SENTINEL");
  await page
    .getByRole("button", { name: "Process & Evidence", exact: true })
    .click();
  await page.getByLabel("Baseline file").setInputFiles({
    name: "baseline.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Volume,Minutes\n10,2\n\n30,4\n"),
  });
  await page.getByLabel("Volume column").selectOption("Volume");
  await page.getByLabel("Time column").selectOption("Minutes");
  await page.getByLabel("Observation period").selectOption("monthly");
  await page.getByLabel("Baseline owner").fill("Analyst");
  await expect(
    page.getByText("480 items/year · 3.5 minutes/item"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Apply baseline to all options" })
    .click();
  await expect(
    page.getByRole("button", { name: /Baseline: baseline.csv/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Baseline: baseline.csv/ }).click();
  await page.getByLabel("Review rationale").fill("Checked synthetic sample");
  await page
    .getByRole("button", { name: "Accept evidence", exact: true })
    .click();
  await expect(
    page.getByText("Review status: accepted", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit engagement brief", exact: true })
    .click();
  await expect(page.getByLabel("Client")).toHaveValue("LOCAL-CONTENT-SENTINEL");
  await page.getByRole("button", { name: "Save brief", exact: true }).click();
  const record = await stored(page);
  expect(JSON.stringify(record)).toContain('"annualVolume":480');
  expect(JSON.stringify(record)).toContain('"minutesBefore":3.5');
  expect(JSON.stringify(record)).toContain('"status":"accepted"');
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Engagement work queue",
  );
  await page
    .getByRole("button", { name: "Synthetic assessment", exact: true })
    .click();
  await expect(page.getByLabel("Client")).toHaveValue("LOCAL-CONTENT-SENTINEL");
  expect(
    sent.some(
      (x) =>
        x.includes("LOCAL-CONTENT-SENTINEL") ||
        x.includes("Checked synthetic sample"),
    ),
  ).toBe(false);
});

test("implemented surfaces are accessible, responsive and inspector returns keyboard focus", async ({
  page,
}, info) => {
  await page.goto("/workbench");
  await page.getByRole("button", { name: "Use support template" }).click();
  for (const name of ["Edit engagement brief", "Process & Evidence"]) {
    await page.getByRole("button", { name, exact: true }).click();
    if (name === "Edit engagement brief") {
      const dimensions = await page
        .getByRole("region", { name: "Process steps", exact: true })
        .locator("tbody tr")
        .first()
        .evaluate((row) => ({
          rowHeight: row.getBoundingClientRect().height,
          actionWidth: row.lastElementChild!.getBoundingClientRect().width,
        }));
      expect(dimensions.actionWidth).toBeGreaterThan(90);
      expect(dimensions.rowHeight).toBeLessThan(120);
    }
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      name === "Edit engagement brief"
        ? "Engagement brief"
        : "Process & Evidence",
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
      path: info.outputPath(`${name.toLowerCase()}-${info.project.name}.png`),
      fullPage: true,
    });
  }
  const inspect = page.getByRole("button", { name: "Inspect source" });
  await inspect.focus();
  await page.keyboard.press("Enter");
  if (info.project.name !== "desktop") {
    await expect(
      page.getByRole("dialog", { name: "Source inspector" }),
    ).toBeVisible();
    await page.keyboard.press("Tab");
    expect(
      await page
        .getByRole("dialog")
        .evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(inspect).toBeFocused();
  } else
    await expect(
      page
        .getByRole("complementary", { name: "Inspector" })
        .getByText("Source inspector"),
    ).toBeVisible();
});

test("inspector snapshots clear after successful edits and reviews", async ({
  page,
}, info) => {
  await page.goto("/workbench");
  await page.getByRole("button", { name: "Use support template" }).click();
  const inspector = () =>
    info.project.name === "desktop"
      ? page.getByRole("complementary", { name: "Inspector" })
      : page.getByRole("dialog");
  async function closeDrawer() {
    if (info.project.name !== "desktop") await page.keyboard.press("Escape");
  }
  await page.getByRole("button", { name: "Inspect readiness" }).click();
  await expect(
    inspector().getByRole("heading", { name: "Engagement history" }),
  ).toBeVisible();
  await closeDrawer();
  await page
    .getByLabel("Client", { exact: true })
    .fill("Updated synthetic client");
  await page.getByRole("button", { name: "Save brief", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  await expect(
    page.getByRole("heading", { name: "Readiness and history" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Inspect readiness" }).click();
  await expect(inspector()).toContainText("Updated engagement brief");
  await closeDrawer();
  await page
    .getByRole("button", { name: "Process & Evidence", exact: true })
    .click();
  await page.getByRole("button", { name: "Inspect source" }).click();
  await expect(inspector()).toContainText("Status: accepted · version 1");
  await closeDrawer();
  await page
    .getByRole("textbox", { name: "Source excerpt", exact: true })
    .fill("Revised synthetic excerpt");
  await page
    .getByRole("button", { name: "Save evidence", exact: true })
    .click();
  await expect(
    page.getByText("Review status: pending", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Source inspector" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Inspect source" }).click();
  await expect(inspector()).toContainText("Status: pending · version 2");
  await expect(inspector()).toContainText("Revised synthetic excerpt");
  await closeDrawer();
  await page
    .getByLabel("Review rationale")
    .fill("Reviewed revised synthetic source");
  await page
    .getByRole("button", { name: "Accept evidence", exact: true })
    .click();
  await expect(
    page.getByText("Review status: accepted", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Source inspector" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Inspect source" }).click();
  await expect(inspector()).toContainText("Status: accepted · version 2");
  await expect(inspector()).toContainText("Reviewed revised synthetic source");
});

test("template and duplicate creation preserve unrelated engagement name drafts", async ({
  page,
}) => {
  await page.goto("/workbench");
  await page.getByLabel("New engagement name").fill("Unfinished blank name");
  for (const action of [
    "Use support template",
    "Use reporting template",
    "Duplicate Support Operations Copilot",
  ]) {
    await page.getByRole("button", { name: action, exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Saved");
    await page.getByRole("button", { name: "Work queue", exact: true }).click();
    await expect(page.getByLabel("New engagement name")).toHaveValue(
      "Unfinished blank name",
    );
  }
  await page
    .getByRole("button", { name: "Create blank engagement", exact: true })
    .click();
  await expect(page.getByLabel("Engagement name", { exact: true })).toHaveValue(
    "Unfinished blank name",
  );
  await page.getByRole("button", { name: "Work queue", exact: true }).click();
  await expect(page.getByLabel("New engagement name")).toHaveValue("");
});

test("templates, independent selection, process drafts, archive and validated backup restore", async ({
  page,
}) => {
  await page.goto("/workbench");
  await page.getByRole("button", { name: "Use support template" }).click();
  await page
    .getByRole("combobox", { name: "Currency", exact: true })
    .selectOption("GBP");
  await page.getByLabel(/numbers are not converted/).check();
  await page.getByRole("button", { name: "Save brief", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  await page.getByLabel("Step 1 annualVolume").fill("100");
  await page
    .getByRole("button", { name: "Save discovery and process" })
    .click();
  const support = (await stored(page)).engagements[0];
  expect(support.currency).toBe("GBP");
  expect(support.opportunities[0].processSteps[0].annualVolume).toBe(100);
  expect(support.opportunities[0].options[0].inputs.annualVolume).toBe(48000);
  await page.getByLabel("New opportunity name").fill("Separate opportunity");
  await page
    .getByRole("button", { name: "Add opportunity", exact: true })
    .click();
  await page
    .getByLabel("Process discovery notes")
    .fill("UNSAVED-PROCESS-DRAFT");
  await page.getByRole("button", { name: "Work queue", exact: true }).click();
  await page.getByRole("button", { name: "Use reporting template" }).click();
  await expect(page.getByLabel("Client", { exact: true })).toHaveValue(
    "Aster Financial Group · synthetic",
  );
  await page
    .getByRole("combobox", { name: "Engagement", exact: true })
    .selectOption(support.id);
  await expect(
    page.getByRole("combobox", { name: "Opportunity", exact: true }),
  ).toHaveValue((await stored(page)).engagements[0].opportunities[1].id);
  await page
    .getByRole("button", { name: "Edit engagement brief", exact: true })
    .click();
  await expect(page.getByLabel("Process discovery notes")).toHaveValue(
    "UNSAVED-PROCESS-DRAFT",
  );
  await page
    .getByRole("button", { name: "Save discovery and process" })
    .click();
  await page.getByRole("button", { name: "Work queue", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Archive Support Operations Copilot",
      exact: true,
    })
    .click();
  await page.getByLabel("Show archived").check();
  await page
    .getByRole("button", {
      name: "Restore Support Operations Copilot",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Duplicate Support Operations Copilot",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Engagement name", { exact: true })).toHaveValue(
    "Support Operations Copilot (copy)",
  );
  await page.getByText("Workspace backup / restore", { exact: true }).click();
  const backup = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download workspace backup", exact: true })
    .click();
  const download = await backup;
  expect(download.suggestedFilename()).toBe("assessment-workspace-backup.json");
  const record = await stored(page);
  expect(record.engagements).toHaveLength(3);
  record.brand.accent = "url(https://example.test/SHOULD-NOT-LOAD)";
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page
    .getByLabel("Restore workspace backup", { exact: true })
    .setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(record)),
    });
  await expect(page.getByText("Validated backup preview")).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Confirm workspace restore" }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  expect(
    await page
      .locator(".aw-shell")
      .evaluate((el) => getComputedStyle(el).getPropertyValue("--aw-accent")),
  ).toBe("#3157d5");
  expect(requests.some((x) => x.includes("SHOULD-NOT-LOAD"))).toBe(false);
  await page.reload();
  expect((await stored(page)).engagements).toHaveLength(3);
});

test("stale saves and stale backup restore never overwrite another tab", async ({
  page,
  context,
}) => {
  await blank(page);
  const second = await context.newPage();
  await second.goto("/workbench");
  await second
    .getByRole("button", { name: "Synthetic assessment", exact: true })
    .click();
  await expect(second.getByLabel("Client", { exact: true })).toHaveValue("");
  const earlier = await stored(page);
  await page.getByLabel("Client", { exact: true }).fill("FIRST-COMMITTED");
  await page.getByRole("button", { name: "Save brief", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  await second.getByLabel("Client", { exact: true }).fill("SECOND-DRAFT");
  await second.getByRole("button", { name: "Save brief", exact: true }).click();
  await expect(
    second.getByRole("button", { name: "Reload saved workspace" }),
  ).toBeVisible();
  expect((await stored(page)).engagements[0].client).toBe("FIRST-COMMITTED");
  await expect(second.getByLabel("Client", { exact: true })).toHaveValue(
    "SECOND-DRAFT",
  );
  await second.getByText("Workspace backup / restore", { exact: true }).click();
  await second
    .getByLabel("Restore workspace backup", { exact: true })
    .setInputFiles({
      name: "earlier.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(earlier)),
    });
  second.once("dialog", (d) => d.accept());
  await second
    .getByRole("button", { name: "Confirm workspace restore" })
    .click();
  await expect(
    second.getByRole("button", { name: "Reload saved workspace" }),
  ).toBeVisible();
  expect((await stored(page)).engagements[0].client).toBe("FIRST-COMMITTED");
  second.once("dialog", (d) => d.dismiss());
  await second.getByRole("button", { name: "Reload saved workspace" }).click();
  await expect(second.getByLabel("Client", { exact: true })).toHaveValue(
    "SECOND-DRAFT",
  );
  second.once("dialog", (d) => d.accept());
  await second.getByRole("button", { name: "Reload saved workspace" }).click();
  await expect(second.getByLabel("Client", { exact: true })).toHaveValue(
    "FIRST-COMMITTED",
  );
  await expect(second.locator(".aw-error")).toHaveCount(0);
  await second.close();
});

test("malformed backups and synchronous storage denial preserve saved records", async ({
  page,
}) => {
  await blank(page);
  const before = await stored(page);
  await page.getByText("Workspace backup / restore", { exact: true }).click();
  for (const text of [
    "not-json",
    '{"schemaVersion":7}',
    '{"schemaVersion":2}',
  ]) {
    await page
      .getByLabel("Restore workspace backup", { exact: true })
      .setInputFiles({
        name: "invalid.json",
        mimeType: "application/json",
        buffer: Buffer.from(text),
      });
    await expect(page.locator(".aw-error").first()).toBeVisible();
    expect(await stored(page)).toEqual(before);
    await expect(
      page.getByRole("button", { name: "Confirm workspace restore" }),
    ).toHaveCount(0);
  }
  await page.addInitScript(() => {
    IDBFactory.prototype.open = () => {
      throw new DOMException("Storage permission denied", "SecurityError");
    };
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Workspace recovery required" }),
  ).toBeVisible();
  await expect(page.locator(".aw-error").first()).toContainText(
    "browser storage permissions",
  );
  await expect(
    page.getByRole("button", { name: "Create blank engagement", exact: true }),
  ).toHaveCount(0);
});

test("native commit, abort and request failure settle without announcing a false save", async ({
  page,
}) => {
  await blank(page);
  await page.evaluate(() => {
    const original = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (
      ...args: Parameters<IDBDatabase["transaction"]>
    ) {
      const tx = original.apply(this, args);
      if (args[1] === "readwrite")
        tx.addEventListener("complete", () => {
          document.documentElement.dataset.statusAtCommit =
            document.querySelector('[role="status"]')?.textContent ?? "";
        });
      return tx;
    };
  });
  await page.getByLabel("Client", { exact: true }).fill("Committed client");
  await page.getByRole("button", { name: "Save brief", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  expect(await page.locator("html").getAttribute("data-status-at-commit")).toBe(
    "Saving…",
  );
  const before = await stored(page);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (
      ...args: Parameters<IDBObjectStore["put"]>
    ) {
      IDBObjectStore.prototype.put = original;
      const request = original.apply(this, args);
      this.transaction.abort();
      return request;
    };
  });
  await page.getByLabel("Client", { exact: true }).fill("Aborted draft");
  await page.getByRole("button", { name: "Save brief", exact: true }).click();
  await expect(page.getByRole("alert").first()).toContainText(
    "previous saved workspace is unchanged",
  );
  expect(await stored(page)).toEqual(before);
  await expect(page.getByRole("status")).not.toContainText("Saved");
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.get = function (key) {
      if (this.transaction.mode === "readwrite") {
        IDBObjectStore.prototype.get = original;
        return this.add({}, "active");
      }
      return original.call(this, key);
    };
  });
  await page.getByRole("button", { name: "Save brief", exact: true }).click();
  await expect(page.getByRole("alert").first()).toContainText(
    "check the saved revision",
  );
  expect(await stored(page)).toEqual(before);
  await page.getByRole("button", { name: "Save brief", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  expect((await stored(page)).engagements[0].client).toBe("Aborted draft");
});

test("native version change closes the repository with reconnect guidance", async ({
  page,
}) => {
  await blank(page);
  const original = await stored(page);
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.open("beck-assessment-workbench", 2);
      r.onsuccess = () => {
        r.result.close();
        resolve();
      };
      r.onerror = () => reject(r.error);
    });
  });
  await page.getByLabel("Client", { exact: true }).fill("Upgrade draft");
  await page.getByRole("button", { name: "Save brief", exact: true }).click();
  await expect(page.getByRole("alert").first()).toContainText(
    "closed for an upgrade",
  );
  await expect(page.getByRole("status")).not.toContainText("Saved");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Workspace recovery required" }),
  ).toBeVisible();
  await expect(page.locator(".aw-error").first()).toContainText(
    "browser storage permissions",
  );
  expect(await stored(page)).toEqual(original);
});

test("manual source edits reset review and preserve escaped notes without changing assumptions", async ({
  page,
}) => {
  await page.goto("/workbench");
  await page.getByRole("button", { name: "Use support template" }).click();
  await page
    .getByRole("button", { name: "Process & Evidence", exact: true })
    .click();
  await page.getByRole("button", { name: "Add manual evidence" }).click();
  await page.getByLabel("Evidence title").fill("Synthetic timing source");
  await page.getByLabel("Source", { exact: true }).fill("Workshop");
  await page
    .getByLabel("Source excerpt")
    .fill('<img src="https://example.test/unsafe" onerror="alert(1)">');
  await page.getByLabel("Internal note", { exact: true }).fill("INTERNAL-ONLY");
  await page
    .getByRole("button", { name: "Save evidence", exact: true })
    .click();
  await expect(
    page.getByText("Review status: pending", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Review rationale").fill("Synthetic content checked");
  await page
    .getByRole("button", { name: "Accept evidence", exact: true })
    .click();
  await expect(
    page.getByText("Review status: accepted", { exact: true }),
  ).toBeVisible();
  const previous = await stored(page);
  await page.getByRole("button", { name: "Inspect source" }).click();
  await expect(
    page.locator('img[src="https://example.test/unsafe"]'),
  ).toHaveCount(0);
  if (await page.getByRole("dialog").count())
    await page.keyboard.press("Escape");
  await page.getByLabel("Source excerpt").fill("Edited sample");
  await page
    .getByRole("button", { name: "Save evidence", exact: true })
    .click();
  await expect(
    page.getByText("Review status: pending", { exact: true }),
  ).toBeVisible();
  const next = await stored(page);
  expect(next.engagements[0].opportunities[0].evidence.at(-1)).toMatchObject({
    version: 2,
    status: "pending",
    reviewRationale: "",
    internalNote: "INTERNAL-ONLY",
  });
  expect(next.engagements[0].opportunities[0].options).toEqual(
    previous.engagements[0].opportunities[0].options,
  );
  await page.getByRole("button", { name: "Add evidence request" }).click();
  await page.getByLabel("Request 2 Question").fill("Who verified the sample?");
  await page.getByLabel("Request 2 Owner").fill("Reviewer");
  await page.getByLabel("Request 2 Decision impact").fill("Confidence");
  await page
    .getByRole("combobox", { name: "Request 2 status" })
    .selectOption("closed");
  await page
    .getByRole("button", { name: "Save requests", exact: true })
    .click();
  expect(
    (await stored(page)).engagements[0].opportunities[0].requests[1],
  ).toMatchObject({ owner: "Reviewer", status: "closed" });
});

test("XLSX sheet mapping preserves sparse rows and rejects invalid previews", async ({
  page,
}) => {
  const book = new ExcelJS.Workbook();
  const bad = book.addWorksheet("Invalid");
  bad.addRow(["Volume", "Time"]);
  bad.addRow([10, "unknown"]);
  const good = book.addWorksheet("Timed sample");
  good.getRow(1).values = ["Volume", "Time"];
  good.getRow(2).values = [10, 120];
  good.getRow(4).values = [30, 240];
  await page.goto("/workbench");
  await page.getByRole("button", { name: "Use reporting template" }).click();
  await page
    .getByRole("button", { name: "Process & Evidence", exact: true })
    .click();
  await page.getByLabel("Baseline file").setInputFiles({
    name: "synthetic.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(await book.xlsx.writeBuffer()),
  });
  await page
    .getByRole("combobox", { name: "Volume column" })
    .selectOption("Volume");
  await page
    .getByRole("combobox", { name: "Time column" })
    .selectOption("Time");
  await page.getByLabel("Baseline owner").fill("Analyst");
  await expect(
    page.getByRole("button", { name: "Apply baseline to all options" }),
  ).toBeDisabled();
  await page
    .getByRole("combobox", { name: "Workbook sheet" })
    .selectOption("Timed sample");
  await page
    .getByRole("combobox", { name: "Time unit" })
    .selectOption("seconds");
  await expect(
    page.getByText("40 items/year · 3.5 minutes/item"),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Baseline source preview" })
      .getByRole("rowheader"),
  ).toHaveText(["2", "4"]);
  await page
    .getByRole("button", { name: "Apply baseline to all options" })
    .click();
  const o = (await stored(page)).engagements[0].opportunities[0];
  expect(o.evidence.at(-1)?.locator).toContain("Timed sample!A2:B2, A4:B4");
  expect(o.options.map((x) => x.inputs.minutesBefore)).toEqual([
    3.5, 3.5, 3.5, 3.5,
  ]);
});

test("legacy migration is explicit, previewed, confirmed and preserves its original raw record", async ({
  page,
}) => {
  const legacy = JSON.stringify(seedWorkspace());
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: STORAGE_KEY, value: legacy },
  );
  await page.goto("/workbench");
  await expect(
    page.getByRole("heading", { name: "Legacy workspace found" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Preview legacy migration" }),
  ).toBeDisabled();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download legacy raw backup" })
    .click();
  await download;
  await page.getByRole("button", { name: "Preview legacy migration" }).click();
  await page
    .getByRole("button", { name: "Import previewed legacy workspace" })
    .click();
  await expect(page.getByRole("status")).toContainText("Saved");
  expect((await stored(page)).migration).toEqual({
    legacyImported: true,
    confirmed: false,
  });
  await page
    .getByRole("button", { name: "Confirm migration reviewed" })
    .click();
  await expect(page.getByRole("status")).toContainText("Saved");
  expect((await stored(page)).migration.confirmed).toBe(true);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
  ).toBe(legacy);
  await page.getByRole("button", { name: "Work queue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Legacy workspace found" }),
  ).toHaveCount(0);
});

test("corrupt native records remain untouched with a diagnostic raw download", async ({
  page,
}) => {
  await page.goto("/workbench");
  await expect(
    page.getByRole("button", { name: "Create blank engagement", exact: true }),
  ).toBeVisible();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("beck-assessment-workbench", 1);
      r.onsuccess = () => resolve(r.result);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("workspace", "readwrite");
      tx.objectStore("workspace").put(
        { schemaVersion: 2, corruptMarker: "KEEP-ORIGINAL" },
        "active",
      );
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Workspace recovery required" }),
  ).toBeVisible();
  await expect(page.getByText(/clean browser profile/)).toBeVisible();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download untouched raw record" })
    .click();
  expect((await download).suggestedFilename()).toBe(
    "assessment-corrupt-raw-record.json",
  );
  expect(await stored(page)).toEqual({
    schemaVersion: 2,
    corruptMarker: "KEEP-ORIGINAL",
  });
  await expect(
    page.getByLabel("Restore workspace backup", { exact: true }),
  ).toHaveCount(0);
});

test("a validated backup can initialise an empty store without using its source revision", async ({
  page,
}) => {
  const backup = createWorkspace();
  backup.revision = 99;
  backup.engagements.push(createEngagement("Recovered assessment"));
  await page.goto("/workbench");
  await page.getByText("Workspace backup / restore", { exact: true }).click();
  await page
    .getByLabel("Restore workspace backup", { exact: true })
    .setInputFiles({
      name: "valid.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup)),
    });
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Confirm workspace restore" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Engagement work queue",
  );
  await page
    .getByRole("button", { name: "Recovered assessment", exact: true })
    .click();
  await expect(page.getByLabel("Engagement name", { exact: true })).toHaveValue(
    "Recovered assessment",
  );
  expect((await stored(page)).revision).toBe(1);
});
