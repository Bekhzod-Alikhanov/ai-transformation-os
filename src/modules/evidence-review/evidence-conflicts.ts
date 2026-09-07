import type { SourceLocator } from "@/modules/sources/source-types";

export type ConflictEvidence = {
  id: string;
  claimKey: string;
  claim: string;
  value: unknown;
  locator: SourceLocator;
};

export type ClaimConflict = {
  claimKey: string;
  status: "unresolved" | "resolved";
  entries: Array<{
    evidenceId: string;
    excerpt: string;
    value: unknown;
    locator: SourceLocator;
  }>;
  selectedEvidenceId?: string;
};

function canonicalValue(value: unknown) {
  return JSON.stringify(value, Object.keys(value ?? {}).sort());
}

export function deriveClaimConflicts(
  evidence: ConflictEvidence[],
): ClaimConflict[] {
  const byClaim = new Map<string, ConflictEvidence[]>();
  for (const item of evidence) {
    const values = byClaim.get(item.claimKey) ?? [];
    values.push(item);
    byClaim.set(item.claimKey, values);
  }
  return [...byClaim.entries()].flatMap(([claimKey, entries]) => {
    const values = new Set(entries.map((entry) => canonicalValue(entry.value)));
    if (values.size < 2) return [];
    return [
      {
        claimKey,
        status: "unresolved" as const,
        entries: entries.map((entry) => ({
          evidenceId: entry.id,
          excerpt: entry.claim,
          value: entry.value,
          locator: entry.locator,
        })),
      },
    ];
  });
}

export function resolveClaimConflict(
  conflict: ClaimConflict,
  selectedEvidenceId: string,
): ClaimConflict {
  if (
    !conflict.entries.some((entry) => entry.evidenceId === selectedEvidenceId)
  ) {
    throw new Error("Resolution must select evidence from the conflict");
  }
  return { ...conflict, status: "resolved", selectedEvidenceId };
}

export function eligibleEvidenceForDecisions<T extends ConflictEvidence>(
  evidence: T[],
  conflicts: ClaimConflict[],
): T[] {
  const conflictsByClaim = new Map(
    conflicts.map((conflict) => [conflict.claimKey, conflict]),
  );
  return evidence.filter((item) => {
    const conflict = conflictsByClaim.get(item.claimKey);
    if (!conflict) return true;
    return (
      conflict.status === "resolved" && conflict.selectedEvidenceId === item.id
    );
  });
}
