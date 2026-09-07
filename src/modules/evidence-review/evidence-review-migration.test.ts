import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = () =>
  readFileSync(
    resolve("supabase/migrations/202608290002_evidence_workbench.sql"),
    "utf8",
  );

describe("evidence workbench migration", () => {
  it("makes candidate review an organisation-bound transaction that records immutable evidence and provenance links", () => {
    const sql = migration();

    expect(sql).toContain(
      "create or replace function public.review_evidence_candidate",
    );
    expect(sql).toContain("for update");
    expect(sql).toContain("target_organisation_id");
    expect(sql).toContain("'ai_inferred'");
    expect(sql).toContain("'user_provided'");
    expect(sql).toContain("parent_evidence_id");
    expect(sql).toContain("stale evidence candidate");
  });

  it("protects opportunity drafts with tenant-aware transitions and an immutable run-event audit trail", () => {
    const sql = migration();

    expect(sql).toContain(
      "create or replace function public.transition_opportunity_draft",
    );
    expect(sql).toContain(
      "create or replace function public.record_agent_run_event",
    );
    expect(sql).toContain("agent_events_immutable");
    expect(sql).toContain("opportunity_draft_evidence");
  });
});
