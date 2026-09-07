import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/202608290003_evidence_workbench_hardening.sql",
);
const pgTapPath = join(process.cwd(), "supabase/tests/evidence_workbench.sql");

describe("evidence workbench hardening migration", () => {
  it("removes authenticated fact writes and gates authoritative RPCs by stored membership", async () => {
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).toContain(
      "revoke insert, update, delete on table public.evidence from authenticated",
    );
    expect(migration).toContain(
      "revoke insert, update, delete on table public.opportunity_drafts from authenticated",
    );
    expect(migration).toContain(
      "create or replace function public.assert_authoritative_actor",
    );
    expect(migration).toContain("actor_user_id uuid");
    expect(migration).toContain("perform public.assert_authoritative_actor");
  });

  it("ships seeded CI-runnable pgTAP scenarios for direct writes, roles, conflicts, revisions, merge, and reject", async () => {
    const tests = await readFile(pgTapPath, "utf8");

    expect(tests).toContain("select plan(26)");
    expect(tests).toContain("direct authenticated linkage fails");
    expect(tests).toContain("viewer cannot review");
    expect(tests).toContain("one-sided conflict cannot create draft");
    expect(tests).toContain("edit preserves immutable revision");
    expect(tests).toContain("merge linkage persists");
    expect(tests).toContain("reject target is denied");
    expect(tests).toContain("reject creates no linkage");
  });
});
