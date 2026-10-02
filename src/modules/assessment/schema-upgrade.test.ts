import { expect, it } from "vitest";
import { createWorkspace, createEngagement, createOpportunity } from "./model";
import { parseBackup } from "./repository";
it("upgrades a valid v2 copy without inventing task inputs or changing the original", () => {
  const old = { ...createWorkspace(), schemaVersion: 2 };
  const e = createEngagement("Saved original");
  e.opportunities.push(createOpportunity("Legacy aggregate"));
  old.engagements.push(e);
  const before = JSON.stringify(old);
  const loaded = parseBackup(before);
  expect(loaded.schemaVersion).toBe(3);
  expect(
    loaded.engagements[0].opportunities[0].options[0].taskPlan,
  ).toBeUndefined();
  expect(JSON.stringify(old)).toBe(before);
});
it("rejects broken references in a v2 migration instead of saving a partial copy", () => {
  const w = { ...createWorkspace(), schemaVersion: 2 };
  const e = createEngagement();
  e.opportunities.push(createOpportunity());
  e.opportunities[0].selectedOptionId = "missing";
  w.engagements.push(e);
  expect(() => parseBackup(JSON.stringify(w))).toThrow(
    /Selected option missing/,
  );
});
