import { expect, it } from "vitest";
import { createTemplate } from "../templates";
import {
  saveOption,
  saveProvenance,
  saveSimulation,
} from "./investment-operations";
import { simulateOption } from "../economics";
import { assessOpportunity } from "../assessment";
import { blockerTarget } from "./investment-operations";

it.each(["conflicted", "rejected"] as const)(
  "opens %s evidence before an accepted linked source",
  (status) => {
    const o = createTemplate("support").opportunities[0],
      a = o.assumptions.find(
        (x) => x.optionId === o.options[2].id && x.field === "reduction",
      )!;
    o.evidence[1].status = status;
    a.evidenceIds = [o.evidence[0].id, o.evidence[1].id];
    const blocker = assessOpportunity(
      createTemplate("support"),
      o,
    ).blockers.find((b) => b.targetId === a.id)!;
    expect(blockerTarget(o, blocker)).toMatchObject({
      section: "evidence",
      recordId: o.evidence[1].id,
    });
  },
);

it("rejects a retained option draft that would overwrite a newer shared baseline", () => {
  const o = createTemplate("support").opportunities[0];
  const original = structuredClone(o.options[2]);
  const draft = structuredClone(original);
  draft.inputs.adoption = 0.6;
  o.options.forEach((x) => (x.inputs.annualVolume = 90000));
  expect(() => saveOption(o, draft, metadata, original)).toThrow(
    /changed.*draft/i,
  );
  expect(o.options[2].inputs.annualVolume).toBe(90000);
});
it("links conflicted evidence to its real source and unlinked assumptions to provenance", () => {
  const o = createTemplate("support").opportunities[0];
  const a = o.assumptions.find(
    (x) => x.optionId === o.options[2].id && x.field === "reduction",
  )!;
  expect(
    blockerTarget(o, {
      section: "evidence",
      targetId: a.id,
      message: "Conflict",
    }),
  ).toMatchObject({ section: "evidence", recordId: o.evidence[1].id });
  const unlinked = o.assumptions.find(
    (x) => x.optionId === o.options[2].id && x.field === "adoption",
  )!;
  expect(
    blockerTarget(o, {
      section: "evidence",
      targetId: unlinked.id,
      message: "Unknown",
    }),
  ).toMatchObject({ section: "options", recordId: unlinked.id });
});

const metadata = {
  owner: "Analyst",
  confidence: "medium" as const,
  evidenceIds: [],
};
it("retires provenance for removed cost fields without erasing history", () => {
  const e = createTemplate("support"),
    o = e.opportunities[0],
    edit = structuredClone(o.options[2]);
  const removed = edit.costs[0].id;
  edit.costs.shift();
  const next = saveOption(o, edit, metadata);
  expect(
    next.assumptions
      .filter((a) => a.field === `costs.${removed}.amount`)
      .at(-1),
  ).toMatchObject({ material: false, version: 2 });
  expect(
    next.assumptions.filter((a) => a.field === `costs.${removed}.amount`),
  ).toHaveLength(2);
  expect(
    assessOpportunity(e, next).blockers.some((b) =>
      b.message.includes(removed),
    ),
  ).toBe(false);
});
it("retires disabled benefit provenance and restores it when re-enabled", () => {
  const o = createTemplate("support").opportunities[0],
    edit = structuredClone(o.options[2]);
  edit.benefits.push({
    id: "quality",
    name: "Quality",
    kind: "quality",
    annualAmount: 100,
    pool: "quality",
    cashShare: 0,
    enabled: true,
    overlapResolved: false,
    mechanism: "Less rework",
  });
  const enabled = saveOption(o, edit, metadata),
    disabledEdit = structuredClone(enabled.options[2]);
  disabledEdit.benefits[0].enabled = false;
  const disabled = saveOption(enabled, disabledEdit, metadata);
  expect(
    disabled.assumptions
      .filter((a) => a.field === "benefits.quality.annualAmount")
      .at(-1),
  ).toMatchObject({ material: false, version: 2 });
  const restored = saveOption(disabled, edit, metadata);
  expect(
    restored.assumptions
      .filter((a) => a.field === "benefits.quality.annualAmount")
      .at(-1),
  ).toMatchObject({ material: true, version: 3 });
});
it("saves independent inputs and shares only baseline changes with versioned provenance", () => {
  const o = createTemplate("support").opportunities[0];
  const edit = structuredClone(o.options[2]);
  edit.inputs.adoption = 0.63;
  edit.inputs.annualVolume = 72000;
  const next = saveOption(o, edit, metadata);
  expect(next.options.map((x) => x.inputs.annualVolume)).toEqual([
    72000, 72000, 72000, 72000,
  ]);
  expect(next.options.map((x) => x.inputs.adoption)).toEqual([
    1, 0.8, 0.63, 0.8,
  ]);
  expect(next.assumptions.at(-1)).toMatchObject({
    owner: "Analyst",
    provenance: "assumed",
    confidence: "medium",
  });
  expect(
    next.assumptions.filter(
      (a) => a.field === "annualVolume" && a.version === 2,
    ),
  ).toHaveLength(4);
  expect(o.options[2].inputs.adoption).toBe(0.8);
});
it("requires ownership and real evidence, and allows metadata revisions without changing inputs", () => {
  const o = createTemplate("support").opportunities[0];
  expect(() => saveOption(o, o.options[2], { ...metadata, owner: "" })).toThrow(
    /owner/i,
  );
  expect(() =>
    saveProvenance(o, o.options[2].id, "adoption", {
      ...metadata,
      evidenceIds: ["missing"],
    }),
  ).toThrow(/evidence/i);
  const next = saveProvenance(o, o.options[2].id, "adoption", {
    ...metadata,
    evidenceIds: [o.evidence[0].id],
  });
  expect(next.options).toEqual(o.options);
  expect(next.assumptions.at(-1)).toMatchObject({
    field: "adoption",
    value: 0.8,
    version: 2,
    evidenceIds: [o.evidence[0].id],
  });
});
it("stores simulation against the captured option only and rejects changed inputs", () => {
  const o = createTemplate("support").opportunities[0];
  const result = simulateOption(o.options[2], o.options[0], 23, {
    inputRevision: o.revision,
  });
  o.selectedOptionId = o.options[1].id;
  const next = saveSimulation(o, o.options[2].id, result);
  expect(next.options[2].simulation?.seed).toBe(23);
  expect(next.options[1].simulation).toBeNull();
  o.revision++;
  expect(() => saveSimulation(o, o.options[2].id, result)).toThrow(
    /changed|revision/i,
  );
}, 15000);
