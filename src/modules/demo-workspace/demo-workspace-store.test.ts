import { describe, expect, it } from "vitest";

import {
  createDemoWorkspaceStore,
  DEMO_WORKSPACE_VERSION,
  objectionStatus,
  searchDemoWorkspace,
} from "./demo-workspace-store";

describe("DemoWorkspaceStore", () => {
  it("seeds exactly the three bounded Synthetic Replay cases", () => {
    const store = createDemoWorkspaceStore("demo-a");

    expect(store.getState().cases.map((item) => item.name)).toEqual([
      "Support Triage",
      "Executive Reporting",
      "Procurement Analysis",
    ]);
    expect(store.getState().version).toBe(DEMO_WORKSPACE_VERSION);
  });

  it("isolates organisations, retains a valid reload, and safely recovers malformed data", () => {
    const persistence = new Map<string, string>();
    const first = createDemoWorkspaceStore("demo-a", persistence);
    first.reviseAssumption("support-triage", "adoption", 0.71, "operator");

    const second = createDemoWorkspaceStore("demo-b", persistence);
    const reloaded = createDemoWorkspaceStore("demo-a", persistence);
    persistence.set("sia-synthetic-replay:demo-c", "not-json");
    const recovered = createDemoWorkspaceStore("demo-c", persistence);

    expect(
      second.getCase("support-triage").assumptions.adoption.value,
    ).not.toBe(0.71);
    expect(reloaded.getCase("support-triage").assumptions.adoption.value).toBe(
      0.71,
    );
    expect(recovered.getState().cases).toHaveLength(3);
  });

  it("migrates old state and reset restores the deterministic seed", () => {
    const persistence = new Map<string, string>();
    const seeded = createDemoWorkspaceStore("demo-a", persistence).getState();
    const store = createDemoWorkspaceStore("demo-a", persistence);
    store.reviseAssumption("support-triage", "adoption", 0.73, "operator");
    store.reset();

    expect(store.getState()).toEqual(seeded);
  });

  it("recalculates economics and produces reproducible stored simulation summaries", () => {
    const store = createDemoWorkspaceStore("demo-a");
    const before = store.getCase("support-triage").economics.threeYearNpv;
    store.reviseAssumption("support-triage", "adoption", 0.75, "operator");
    const after = store.getCase("support-triage").economics.threeYearNpv;
    const one = store.runSimulation("support-triage", "base");
    const two = store.runSimulation("support-triage", "base");

    expect(after).toBeGreaterThan(before);
    expect(one).toEqual(two);
    expect(one.histogram).toHaveLength(8);
    expect(one).not.toHaveProperty("samples");
  });

  it("stores a validated custom 10,000-sample scenario alongside the seeded comparison", () => {
    const store = createDemoWorkspaceStore("demo-a");

    const custom = store.runSimulation("support-triage", "custom", {
      adoption: 0.7,
      benefit: 0.92,
    });

    expect(custom.scenario).toBe("custom");
    expect(custom.iterations).toBe(10_000);
    expect(store.getCase("support-triage").simulations.custom).toEqual(custom);
    expect(() =>
      store.runSimulation("support-triage", "custom", {
        adoption: 1.2,
        benefit: -1,
      }),
    ).toThrow("Custom adoption must be between 0.2 and 0.95");
  });

  it("records immutable assumption snapshots and derives the current value from the latest revision", () => {
    const store = createDemoWorkspaceStore("demo-a", new Map());
    const before = store.getCase("support-triage").assumptions.adoption;

    store.reviseAssumption("support-triage", "adoption", 0.71, "Beck");
    const useCase = store.getCase("support-triage");
    const snapshot = useCase.assumptionRevisions.at(-1);

    expect(snapshot).toMatchObject({
      assumptionKey: "adoption",
      oldValue: before.value,
      newValue: 0.71,
      provenance: "assumed",
      confidence: "medium",
      evidenceId: "ev-1",
      owner: "Beck",
      version: 2,
    });
    expect(snapshot?.at).toBeTruthy();
    expect(useCase.assumptions.adoption.value).toBe(snapshot?.newValue);
    expect(before.value).toBe(0.62);
  });

  it("validates citations, advances committee progress, and retries the scripted failure", () => {
    const store = createDemoWorkspaceStore("demo-a");
    const first = store.runCommittee("support-triage", [
      {
        specialist: "Value Analyst",
        rationale: "Invalid citation fixture.",
        citations: ["ev-4"],
      },
    ]);
    const invalidRetry = store.retryCommittee("support-triage", [
      {
        specialist: "CFO Red Team",
        rationale: "Missing evidence.",
        citations: ["missing"],
      },
    ]);
    const retried = store.retryCommittee("support-triage");

    expect(first.status).toBe("failed");
    expect(first.events[0]).toMatchObject({
      status: "failed",
      invalidCitations: ["ev-4"],
    });
    expect(invalidRetry.status).toBe("failed");
    expect(retried.status).toBe("complete");
    expect(retried.progress).toBe(100);
  });

  it("stores CFO objection actions and appends governed decisions to derived queues", () => {
    const store = createDemoWorkspaceStore("demo-a", new Map());
    store.resolveObjection("support-triage", "capacity-cash", {
      status: "request_evidence",
      actor: "Beck",
      rationale: "Need a 30-day adoption measurement.",
    });
    const decision = store.appendDecision("support-triage", {
      recommendation: "conditional_go",
      beckDecision: "approved",
      rationale: "Measured pilot before scale.",
      conditions: ["Validate adoption after 30 days"],
      followUp: "Schedule value review",
      override: "",
    });

    expect(
      objectionStatus(store.getCase("support-triage").objections[0]!),
    ).toBe("request_evidence");
    expect(
      store.getCase("support-triage").objections[0]?.actions.at(-1),
    ).toMatchObject({
      actor: "Beck",
      rationale: "Need a 30-day adoption measurement.",
      assumptionRevision: 1,
    });
    expect(store.getState().decisions).toContainEqual(decision);
    expect(store.getState().myWork[0]?.caseId).toBe("support-triage");
    expect(store.getState().activity.at(-1)?.type).toBe("decision_appended");
  });

  it("searches local cases, sources, accepted evidence, use cases, decisions, and activity", () => {
    const store = createDemoWorkspaceStore("demo-a", new Map());
    store.appendDecision("support-triage", {
      recommendation: "conditional_go",
      beckDecision: "approved",
      rationale: "Support queue measurement approved.",
      conditions: [],
      followUp: "Review Support queue",
      override: "",
    });
    const results = searchDemoWorkspace(store.getState(), "support");

    expect(new Set(results.map((result) => result.kind))).toEqual(
      new Set([
        "case",
        "source",
        "accepted_evidence",
        "use_case",
        "decision",
        "activity",
      ]),
    );
    expect(results.every((result) => result.caseId === "support-triage")).toBe(
      true,
    );
    expect(results.find((result) => result.kind === "case")).toMatchObject({
      label: "Support Triage",
      detail:
        "Route and prepare support work with evidence-linked human review.",
    });
    expect(results.find((result) => result.kind === "use_case")).toMatchObject({
      label: "Support Queue Copilot",
      detail:
        "Local use case for queue preparation with analyst-controlled escalation.",
    });
  });
});
