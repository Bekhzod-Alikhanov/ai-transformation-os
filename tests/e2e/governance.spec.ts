import { expect, test } from "@playwright/test";
import { createWorkspace } from "../../src/modules/assessment/model";
import { createTemplate } from "../../src/modules/assessment/templates";
test("public entry uses one populated product without email or a guided tour", async ({
  page,
}) => {
  for (const path of [
    "/",
    "/demo",
    "/auth/sign-in",
    "/opportunities",
    "/portfolio",
    "/integrations",
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", {
        name: "Support Operations Copilot",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByLabel("Work email")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /guided tour|Начать тур/i }),
    ).toHaveCount(0);
    await expect(
      page
        .getByRole("navigation", { name: "Assessment sections" })
        .getByRole("button"),
    ).toHaveCount(5);
  }
});
test("demo reset is cancellable and cannot change saved workbench records", async ({
  page,
}) => {
  await page.goto("/workbench");
  await page
    .getByLabel("New engagement name")
    .fill("My synthetic saved assessment");
  await page.getByRole("button", { name: "Create blank engagement" }).click();
  await page.goto("/demo");
  await page
    .getByLabel("Engagement", { exact: true })
    .selectOption({ label: "Executive Reporting Automation" });
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Executive Reporting Automation",
      exact: true,
    }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Support Operations Copilot",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/workbench");
  await expect(
    page.getByRole("button", {
      name: "My synthetic saved assessment",
      exact: true,
    }),
  ).toBeVisible();
});
test("native v2 migration retains the original and keeps aggregate modelling", async ({
  page,
}) => {
  const old = { ...createWorkspace(), schemaVersion: 2 };
  old.engagements = [createTemplate("support", "legacy_aggregate")];
  await page.goto("/workbench");
  await expect(
    page.getByRole("heading", { name: "Start an assessment" }),
  ).toBeVisible();
  await page.evaluate(async (value) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("beck-assessment-workbench");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction("workspace", "readwrite");
      t.objectStore("workspace").put(value, "active");
      t.oncomplete = () => resolve();
      t.onabort = () => reject(t.error);
    });
    db.close();
  }, old);
  await page.reload();
  await page
    .getByRole("button", { name: old.engagements[0].name, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Edit engagement brief", exact: true })
    .click();
  await page.getByLabel("Client", { exact: true }).fill("Saved v3 edit");
  await page.getByRole("button", { name: "Save brief", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  const facts = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("beck-assessment-workbench");
      r.onsuccess = () => resolve(r.result);
    });
    const read = (key: string) =>
      new Promise<unknown>((resolve) => {
        const r = db.transaction("workspace").objectStore("workspace").get(key);
        r.onsuccess = () => resolve(r.result);
      });
    const active = await read("active"),
      retained = await read("retained-version-2-original");
    db.close();
    return { active, retained };
  });
  expect(facts.retained).toEqual(old);
  expect(facts.active).toMatchObject({
    schemaVersion: 3,
    engagements: [{ client: "Saved v3 edit" }],
  });
  expect(JSON.stringify(facts.active)).not.toContain('"taskPlan"');
});
