import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve("supabase/migrations/202608290001_source_intake_hardening.sql"),
  "utf8",
);
const pgtap = readFileSync(resolve("supabase/tests/source_intake.sql"), "utf8");

describe("source intake hardening migration", () => {
  it("keeps lifecycle RPCs and source updates behind the trusted service boundary", () => {
    expect(migration).toContain("drop policy if exists sources_update");
    expect(migration).toContain(
      "revoke execute on function public.complete_source_upload(uuid, uuid, jsonb) from authenticated",
    );
    expect(migration).not.toContain(
      "grant execute on function public.complete_source_upload(uuid, uuid, jsonb) to authenticated",
    );
  });

  it("binds source facts to organisation-scoped composite parents", () => {
    for (const constraint of [
      "source_items_org_source_fkey",
      "ingestion_runs_org_source_fkey",
      "evidence_candidates_org_run_fkey",
      "evidence_org_source_item_fkey",
      "agent_events_org_run_fkey",
      "approval_revisions_org_approval_fkey",
    ]) {
      expect(migration).toContain(constraint);
    }
    expect(migration).toContain(
      "create table public.opportunity_draft_evidence",
    );
    expect(migration).toContain("drop column evidence_ids");
  });

  it("defines destructive, replay-safe purge and behavioral pgTAP coverage", () => {
    expect(migration).toContain("idempotency_key set not null");
    expect(migration).toContain("delete from public.evidence_candidates");
    expect(migration).toContain("delete from public.sources");
    expect(pgtap).toContain(
      "authenticated clients cannot invoke trusted completion",
    );
    expect(pgtap).toContain("duplicate purge reuses the same receipt");
    expect(pgtap).toContain("terminal candidate deletes are denied");
  });

  it("exercises the complete source-derived lineage in the purge pgTAP scenario", () => {
    for (const table of [
      "public.evidence_candidates",
      "public.evidence",
      "public.evidence_reviews",
      "public.evidence_links",
      "public.assumptions",
      "public.measurements",
      "public.opportunity_drafts",
      "public.opportunity_draft_evidence",
    ]) {
      expect(pgtap).toContain(`insert into ${table}`);
      expect(pgtap).toContain(`from ${table}`);
    }
    expect(pgtap).toContain("insert into public.pilots");
    expect(pgtap).toContain("insert into public.kpis");
    expect(pgtap).toContain(
      "purge retains exactly one deterministic content-free receipt",
    );
    expect(pgtap).toContain(
      "purge replay does not recreate source-derived rows",
    );
    expect(migration).toContain("delete from public.opportunity_drafts");
  });
});
