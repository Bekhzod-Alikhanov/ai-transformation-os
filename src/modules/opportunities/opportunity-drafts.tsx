"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type OpportunityDraftView = {
  id: string;
  title: string;
  problemStatement: string;
  businessUnit: string | null;
  evidenceIds: string[];
  status: "draft" | "merged" | "rejected" | "promoted";
  version: number;
};
export type EligibleEvidenceView = {
  id: string;
  claim: string;
  sourceName: string;
};

export function OpportunityDrafts({
  drafts,
  useCases,
  eligibleEvidence = [],
}: {
  drafts: OpportunityDraftView[];
  useCases: Array<{ id: string; title: string }>;
  eligibleEvidence?: EligibleEvidenceView[];
}) {
  const router = useRouter();
  const [activeDrafts, setActiveDrafts] = useState(drafts);
  const [targetByDraft, setTargetByDraft] = useState<Record<string, string>>(
    {},
  );
  const [busyDraft, setBusyDraft] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<OpportunityDraftView | null>(null);
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);

  async function transition(
    draft: OpportunityDraftView,
    action: "merge" | "reject" | "promote",
  ) {
    if (busyDraft) return;
    const targetUseCaseId =
      action === "reject" ? undefined : targetByDraft[draft.id];
    if (action === "merge" && !targetUseCaseId) {
      setMessage("Choose a merge target before merging this draft.");
      return;
    }
    if (action === "reject") {
      setTargetByDraft((current) => ({ ...current, [draft.id]: "" }));
    }
    setBusyDraft(draft.id);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/opportunities/drafts/${draft.id}/transition`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action,
            expectedVersion: draft.version,
            ...(targetUseCaseId ? { targetUseCaseId } : {}),
          }),
        },
      );
      const result = (await response.json()) as {
        error?: string;
        status?: string;
      };
      if (!response.ok) throw new Error(result.error ?? "Draft action failed");
      setActiveDrafts((current) =>
        current.filter((item) => item.id !== draft.id),
      );
      setMessage(
        result.status === "merged"
          ? "Draft merged"
          : result.status === "promoted"
            ? "Draft promoted"
            : "Draft rejected",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Draft action failed",
      );
    } finally {
      setBusyDraft(null);
    }
  }

  async function saveEdit() {
    if (!editing || busyDraft) return;
    if (!selectedEvidenceIds.length) {
      setMessage(
        "Choose at least one accepted, conflict-safe evidence record.",
      );
      return;
    }
    setBusyDraft(editing.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/opportunities/drafts/${editing.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedVersion: editing.version,
          title: editing.title,
          problemStatement: editing.problemStatement,
          businessUnit: editing.businessUnit,
          evidenceIds: selectedEvidenceIds,
        }),
      });
      const result = (await response.json()) as OpportunityDraftView & {
        error?: string;
      };
      if (!response.ok) throw new Error(result.error ?? "Draft edit failed");
      setActiveDrafts((current) =>
        current.map((draft) => (draft.id === editing.id ? result : draft)),
      );
      setEditing(null);
      setMessage("Draft saved");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Draft edit failed");
    } finally {
      setBusyDraft(null);
    }
  }

  return (
    <section aria-label="Opportunity drafts" className="space-y-3">
      {activeDrafts.map((draft) => (
        <article
          className="border border-[#cacbc3] bg-[#fffef9] p-4"
          key={draft.id}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#25806a]">
            Editable draft · v{draft.version}
          </p>
          <h2 className="mt-1 font-serif text-xl text-[#20221e]">
            {draft.title}
          </h2>
          <p className="mt-2 text-sm text-[#454841]">
            {draft.problemStatement}
          </p>
          <p className="mt-2 text-xs text-[#62655d]">
            {draft.evidenceIds.length} accepted, conflict-safe evidence record
            {draft.evidenceIds.length === 1 ? "" : "s"}
          </p>
          {editing?.id === draft.id ? (
            <div className="mt-4 space-y-3 border-t border-[#d9d9d1] pt-3">
              <label className="block text-xs font-semibold text-[#454841]">
                Draft title
                <input
                  className="mt-1 block w-full border border-[#cacbc3] bg-white px-2 py-1.5"
                  onChange={(event) =>
                    setEditing({ ...editing, title: event.target.value })
                  }
                  value={editing.title}
                />
              </label>
              <label className="block text-xs font-semibold text-[#454841]">
                Problem statement
                <textarea
                  className="mt-1 block min-h-20 w-full border border-[#cacbc3] bg-white px-2 py-1.5"
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      problemStatement: event.target.value,
                    })
                  }
                  value={editing.problemStatement}
                />
              </label>
              <label className="block text-xs font-semibold text-[#454841]">
                Business unit
                <input
                  className="mt-1 block w-full border border-[#cacbc3] bg-white px-2 py-1.5"
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      businessUnit: event.target.value || null,
                    })
                  }
                  value={editing.businessUnit ?? ""}
                />
              </label>
              <fieldset className="space-y-1 text-xs text-[#454841]">
                <legend className="font-semibold">Accepted evidence</legend>
                {eligibleEvidence.map((evidence) => (
                  <label className="flex gap-2" key={evidence.id}>
                    <input
                      checked={selectedEvidenceIds.includes(evidence.id)}
                      onChange={(event) =>
                        setSelectedEvidenceIds((current) =>
                          event.target.checked
                            ? [...current, evidence.id]
                            : current.filter((id) => id !== evidence.id),
                        )
                      }
                      type="checkbox"
                    />
                    {evidence.claim} · {evidence.sourceName}
                  </label>
                ))}
              </fieldset>
              <button
                className="rounded-sm bg-[#3157d5] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                disabled={busyDraft !== null}
                onClick={() => void saveEdit()}
                type="button"
              >
                Save draft changes
              </button>
            </div>
          ) : null}
          <label className="mt-4 block text-xs font-semibold text-[#454841]">
            Merge target
            <select
              aria-label="Merge target"
              className="mt-1 block w-full border border-[#cacbc3] bg-white px-2 py-1.5"
              onChange={(event) =>
                setTargetByDraft((current) => ({
                  ...current,
                  [draft.id]: event.target.value,
                }))
              }
              value={targetByDraft[draft.id] ?? ""}
            >
              <option value="">Choose an organisation use case</option>
              {useCases.map((useCase) => (
                <option key={useCase.id} value={useCase.id}>
                  {useCase.title}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="rounded-sm border border-[#3157d5] px-3 py-2 text-xs font-semibold text-[#3157d5] disabled:opacity-50"
              disabled={busyDraft !== null}
              onClick={() => {
                setEditing(draft);
                setSelectedEvidenceIds(draft.evidenceIds);
                setMessage(null);
              }}
              type="button"
            >
              Edit draft
            </button>
            <button
              className="rounded-sm bg-[#3157d5] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              disabled={busyDraft !== null}
              onClick={() => void transition(draft, "merge")}
              type="button"
            >
              Merge draft
            </button>
            <button
              className="rounded-sm border border-[#25806a] px-3 py-2 text-xs font-semibold text-[#25806a] disabled:opacity-50"
              disabled={busyDraft !== null}
              onClick={() => void transition(draft, "promote")}
              type="button"
            >
              Promote draft
            </button>
            <button
              className="rounded-sm border border-[#ca5353] px-3 py-2 text-xs font-semibold text-[#ad3f3f] disabled:opacity-50"
              disabled={busyDraft !== null}
              onClick={() => void transition(draft, "reject")}
              type="button"
            >
              Reject draft
            </button>
          </div>
        </article>
      ))}
      {activeDrafts.length === 0 ? (
        <p className="border border-dashed border-[#cacbc3] p-5 text-sm text-[#62655d]">
          No active opportunity drafts. Run Opportunity Miner from accepted,
          conflict-safe evidence to create one.
        </p>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
