import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { WorkspaceContext } from "@/modules/auth/workspace-context";

import type {
  EvidenceWorkbenchCandidate,
  EvidenceWorkbenchConflict,
  EvidenceWorkbenchSource,
} from "./evidence-workbench";
import { excerptForLocator } from "./source-locator-excerpt";

type Row = Record<string, unknown>;

export function mapIngestionSourceQueue(
  rows: Row[],
): EvidenceWorkbenchSource[] {
  return rows.flatMap((row) => {
    const source = (row.sources as Row | null) ?? {};
    const sourceStatus = String(source.status ?? "");
    const runStatus = String(row.status);
    const sourceLifecycleStatus =
      sourceStatus === "awaiting_upload" ||
      sourceStatus === "uploading" ||
      sourceStatus === "validating"
        ? "uploading"
        : sourceStatus === "extracting" || sourceStatus === "parsing"
          ? "parsing"
          : sourceStatus === "review_ready"
            ? "review_required"
            : sourceStatus;
    const actionableStatuses = [
      "uploading",
      "queued",
      "parsing",
      "requires_ocr",
      "review_required",
      "failed",
    ];
    const status = actionableStatuses.includes(sourceLifecycleStatus)
      ? sourceLifecycleStatus
      : runStatus === "running" || runStatus === "parsing"
        ? "parsing"
        : runStatus;
    if (!(actionableStatuses as string[]).includes(status)) {
      return [];
    }
    return [
      {
        id: String(row.id),
        sourceName: String(source.name ?? "Source record"),
        sourceStatus: status as EvidenceWorkbenchSource["sourceStatus"],
      },
    ];
  });
}

function locatorLabel(locator: unknown) {
  const value = locator as Record<string, unknown> | null;
  if (value?.type === "text_line")
    return `Lines ${value.startLine}–${value.endLine}`;
  if (value?.type === "pdf_page") return `Page ${value.page}`;
  if (value?.type === "csv_row") return `Row ${value.row}`;
  return "Source locator";
}

export async function loadEvidenceWorkbenchData(
  workspace: WorkspaceContext,
): Promise<{
  candidates: EvidenceWorkbenchCandidate[];
  sources: EvidenceWorkbenchSource[];
  conflicts: EvidenceWorkbenchConflict[];
  activeRunId: string | null;
}> {
  const client = createSupabaseServiceClient();
  if (!client)
    return { candidates: [], sources: [], conflicts: [], activeRunId: null };
  const result = await (
    client as unknown as {
      from(table: string): {
        select(columns: string): {
          eq(
            column: string,
            value: string,
          ): Promise<{ data: Row[] | null; error: unknown }>;
        };
      };
    }
  )
    .from("evidence_candidates")
    .select(
      "id,claim_key,claim,value,confidence,source_locator,status,created_at,source_items(content,sources(name,status))",
    )
    .eq("organisation_id", workspace.organisationId);
  const candidates = (result.error ? [] : (result.data ?? []))
    .filter((row) => row.status === "pending" || row.status === "conflicted")
    .map((row) => {
      const item = (row.source_items as Row | null) ?? {};
      const source = (item.sources as Row | null) ?? {};
      return {
        id: String(row.id),
        sourceName: String(source.name ?? "Source record"),
        sourceStatus:
          source.status === "failed" || source.status === "queued"
            ? source.status
            : "review_ready",
        claimKey: String(row.claim_key),
        claim: String(row.claim),
        value:
          typeof row.value === "string" ? row.value : JSON.stringify(row.value),
        confidence: Number(row.confidence),
        locatorLabel: locatorLabel(row.source_locator),
        sourceExcerpt: excerptForLocator(
          (item.content as string | null) ?? null,
          row.source_locator as Parameters<typeof excerptForLocator>[1],
        ),
        createdAt: String(row.created_at),
      } satisfies EvidenceWorkbenchCandidate;
    });
  const acceptedEvidenceResult = await (
    client as unknown as {
      from(table: "evidence"): {
        select(columns: string): {
          eq(
            column: string,
            value: string,
          ): Promise<{ data: Row[] | null; error: unknown }>;
        };
      };
    }
  )
    .from("evidence")
    .select(
      "id,claim_key,claim,value,source_locator,source_items(content),evidence_reviews(decision)",
    )
    .eq("organisation_id", workspace.organisationId);
  const resolutionResult = await (
    client as unknown as {
      from(table: "claim_conflict_resolutions"): {
        select(columns: string): {
          eq(
            column: string,
            value: string,
          ): Promise<{ data: Row[] | null; error: unknown }>;
        };
      };
    }
  )
    .from("claim_conflict_resolutions")
    .select("claim_key,selected_evidence_id")
    .eq("organisation_id", workspace.organisationId);
  const acceptedEvidence = (acceptedEvidenceResult.data ?? []).filter((row) =>
    ((row.evidence_reviews as Row[] | null) ?? []).some(
      (review) =>
        review.decision === "accepted" || review.decision === "edited",
    ),
  );
  const resolvedClaims = new Map(
    (resolutionResult.data ?? []).map((row) => [
      String(row.claim_key),
      String(row.selected_evidence_id),
    ]),
  );
  const byClaim = new Map<string, Row[]>();
  for (const evidence of acceptedEvidence) {
    const entries = byClaim.get(String(evidence.claim_key)) ?? [];
    entries.push(evidence);
    byClaim.set(String(evidence.claim_key), entries);
  }
  const conflicts = [...byClaim.entries()].flatMap(([claimKey, entries]) => {
    if (new Set(entries.map((entry) => JSON.stringify(entry.value))).size < 2)
      return [];
    if (resolvedClaims.has(claimKey)) return [];
    return [
      {
        claimKey,
        entries: entries.map((entry) => {
          const item = (entry.source_items as Row | null) ?? {};
          return {
            evidenceId: String(entry.id),
            excerpt: excerptForLocator(
              (item.content as string | null) ?? String(entry.claim),
              entry.source_locator as Parameters<typeof excerptForLocator>[1],
            ),
            locatorLabel: locatorLabel(entry.source_locator),
            value:
              typeof entry.value === "string"
                ? entry.value
                : JSON.stringify(entry.value),
          };
        }),
      },
    ];
  });
  const ingestionResult = await (
    client as unknown as {
      from(table: "ingestion_runs"): {
        select(columns: string): {
          eq(
            column: string,
            value: string,
          ): Promise<{
            data: Row[] | null;
            error: unknown;
          }>;
        };
      };
    }
  )
    .from("ingestion_runs")
    .select("id,status,source_id,sources(id,name,status)")
    .eq("organisation_id", workspace.organisationId);
  const runResult = await (
    client as unknown as {
      from(table: "agent_runs"): {
        select(columns: string): {
          eq(
            column: string,
            value: string,
          ): {
            in(
              column: string,
              values: string[],
            ): {
              order(
                column: string,
                options: { ascending: boolean },
              ): Promise<{
                data: Array<{ id: string }> | null;
                error: unknown;
              }>;
            };
          };
        };
      };
    }
  )
    .from("agent_runs")
    .select("id")
    .eq("organisation_id", workspace.organisationId)
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: false });
  return {
    candidates,
    sources: ingestionResult.error
      ? []
      : mapIngestionSourceQueue(ingestionResult.data ?? []),
    conflicts,
    activeRunId: runResult.error ? null : (runResult.data?.[0]?.id ?? null),
  };
}
