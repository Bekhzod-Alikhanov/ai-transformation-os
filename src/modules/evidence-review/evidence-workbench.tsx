"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { RunEventFeed } from "./run-event-feed";

export type EvidenceWorkbenchCandidate = {
  id: string;
  sourceName: string;
  sourceStatus: "review_ready" | "failed" | "queued";
  claimKey: string;
  claim: string;
  value: string;
  confidence: number;
  locatorLabel: string;
  sourceExcerpt: string;
  createdAt: string;
};
export type EvidenceWorkbenchConflict = {
  claimKey: string;
  entries: Array<{
    evidenceId: string;
    excerpt: string;
    locatorLabel: string;
    value: string;
  }>;
};
export type EvidenceWorkbenchSource = {
  id: string;
  sourceName: string;
  sourceStatus:
    | "uploading"
    | "queued"
    | "parsing"
    | "requires_ocr"
    | "review_required"
    | "failed";
};

function useDesktopInspector() {
  const [desktop, setDesktop] = useState(() =>
    typeof window === "undefined" || !window.matchMedia
      ? true
      : window.matchMedia("(min-width: 1025px)").matches,
  );
  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia("(min-width: 1025px)");
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  return desktop;
}

function ReviewPanel({
  selected,
  conflicts,
  organisationId,
  activeRunId,
  busy,
  conflictBusy,
  onReview,
  onResolveConflict,
}: {
  selected: EvidenceWorkbenchCandidate | null;
  conflicts: EvidenceWorkbenchConflict[];
  organisationId?: string;
  activeRunId?: string | null;
  busy: boolean;
  conflictBusy: boolean;
  onReview: (
    decision: "accepted" | "edited" | "rejected",
    value?: string,
  ) => void;
  onResolveConflict: (input: {
    claimKey: string;
    selectedEvidenceId: string;
    rationale: string;
  }) => void;
}) {
  const [editedValue, setEditedValue] = useState("");
  const [resolutionChoice, setResolutionChoice] = useState<
    Record<string, string>
  >({});
  const [resolutionRationale, setResolutionRationale] = useState<
    Record<string, string>
  >({});
  return (
    <div className="space-y-4 p-4">
      {selected ? (
        <>
          <div>
            <p className="text-xs font-semibold text-[#20221e]">
              Candidate claim
            </p>
            <p className="mt-1 text-sm leading-6 text-[#454841]">
              {selected.claim}
            </p>
            <p className="mt-2 font-mono text-xs text-[#25806a]">
              {selected.value}
            </p>
          </div>
          <div className="border-y border-[#d9d9d1] py-3 text-xs text-[#62655d]">
            <p>AI-inferred on acceptance · immutable source trace</p>
            <p className="mt-1">
              Editing preserves inference and creates linked user-provided
              evidence.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="rounded-sm bg-[#3157d5] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              disabled={busy}
              onClick={() => onReview("accepted")}
              type="button"
            >
              Accept evidence
            </button>
            <button
              className="rounded-sm border border-[#ca5353] px-3 py-2 text-xs font-semibold text-[#ad3f3f] disabled:opacity-50"
              disabled={busy}
              onClick={() => onReview("rejected")}
              type="button"
            >
              Reject candidate
            </button>
          </div>
          <label className="block text-xs font-semibold text-[#454841]">
            Corrected value
            <input
              className="mt-1.5 w-full rounded-sm border border-[#cbcbbf] bg-white px-2 py-2 text-sm"
              onChange={(event) => setEditedValue(event.target.value)}
              placeholder="e.g. 6.5 hours"
              value={editedValue}
            />
          </label>
          <button
            className="w-full rounded-sm border border-[#3157d5] px-3 py-2 text-xs font-semibold text-[#3157d5] disabled:opacity-50"
            disabled={!editedValue || busy}
            onClick={() => onReview("edited", editedValue)}
            type="button"
          >
            Save linked correction
          </button>
        </>
      ) : (
        <p className="text-sm text-[#62655d]">
          No candidate is selected. Resolve the accepted-evidence conflicts
          below before mining an opportunity.
        </p>
      )}
      {conflicts.map((conflict) => (
        <section
          className="border-t border-[#d9d9d1] pt-3"
          key={conflict.claimKey}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#a8651b]">
            Unresolved conflict · {conflict.claimKey}
          </p>
          <fieldset className="mt-2 space-y-2">
            <legend className="sr-only">
              Select accepted evidence for {conflict.claimKey}
            </legend>
            {conflict.entries.map((entry) => (
              <label
                className="border-l-2 border-[#d89b4c] pl-2 text-xs"
                key={`${entry.locatorLabel}:${entry.value}`}
              >
                <input
                  checked={
                    resolutionChoice[conflict.claimKey] === entry.evidenceId
                  }
                  className="mr-2"
                  name={`conflict-${conflict.claimKey}`}
                  onChange={() =>
                    setResolutionChoice((current) => ({
                      ...current,
                      [conflict.claimKey]: entry.evidenceId,
                    }))
                  }
                  type="radio"
                  value={entry.evidenceId}
                />
                <p className="text-[#454841]">{entry.excerpt}</p>
                <p className="mt-1 font-mono text-[#a8651b]">
                  {entry.value} · {entry.locatorLabel}
                </p>
              </label>
            ))}
          </fieldset>
          <label className="mt-3 block text-xs font-semibold text-[#454841]">
            Resolution rationale
            <textarea
              className="mt-1.5 min-h-16 w-full rounded-sm border border-[#cbcbbf] bg-white px-2 py-2 text-sm"
              onChange={(event) =>
                setResolutionRationale((current) => ({
                  ...current,
                  [conflict.claimKey]: event.target.value,
                }))
              }
              value={resolutionRationale[conflict.claimKey] ?? ""}
            />
          </label>
          <button
            className="mt-2 w-full rounded-sm border border-[#a8651b] px-3 py-2 text-xs font-semibold text-[#a8651b] disabled:opacity-50"
            disabled={
              conflictBusy ||
              !resolutionChoice[conflict.claimKey] ||
              !resolutionRationale[conflict.claimKey]?.trim()
            }
            onClick={() =>
              onResolveConflict({
                claimKey: conflict.claimKey,
                selectedEvidenceId: resolutionChoice[conflict.claimKey]!,
                rationale: resolutionRationale[conflict.claimKey]!.trim(),
              })
            }
            type="button"
          >
            Resolve conflict
          </button>
        </section>
      ))}
      {organisationId && activeRunId ? (
        <RunEventFeed organisationId={organisationId} runId={activeRunId} />
      ) : null}
    </div>
  );
}

export function EvidenceWorkbench({
  candidates: initialCandidates,
  conflicts,
  sources = [],
  organisationId,
  activeRunId,
}: {
  candidates: EvidenceWorkbenchCandidate[];
  conflicts: EvidenceWorkbenchConflict[];
  sources?: EvidenceWorkbenchSource[];
  organisationId?: string;
  activeRunId?: string | null;
}) {
  const router = useRouter();
  const desktopInspector = useDesktopInspector();
  const [candidates, setCandidates] = useState(initialCandidates);
  const [selectedId, setSelectedId] = useState(
    initialCandidates[0]?.id ?? null,
  );
  const [reviewState, setReviewState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [activeConflicts, setActiveConflicts] = useState(conflicts);
  const [conflictState, setConflictState] = useState<"idle" | "saving">("idle");
  const selected = useMemo(
    () => candidates.find((candidate) => candidate.id === selectedId) ?? null,
    [candidates, selectedId],
  );
  async function persistReview(
    decision: "accepted" | "edited" | "rejected",
    editedValue?: string,
  ) {
    if (!selected || reviewState === "saving") return;
    setReviewState("saving");
    setMessage(null);
    try {
      const response = await fetch(
        `/api/evidence/candidates/${selected.id}/review`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            decision,
            rationale:
              decision === "rejected"
                ? "Rejected from the evidence desk."
                : "Reviewed from the evidence desk.",
            ...(decision === "edited" ? { editedValue } : {}),
          }),
        },
      );
      const result = (
        typeof response.json === "function"
          ? await response.json().catch(() => ({}))
          : {}
      ) as { error?: string };
      if (!response.ok)
        throw new Error(result.error ?? "Review could not be saved");
      const next = candidates.filter(
        (candidate) => candidate.id !== selected.id,
      );
      setCandidates(next);
      setSelectedId(next[0]?.id ?? null);
      setReviewState("saved");
      setMessage("Review saved");
      router.refresh();
    } catch (error) {
      setReviewState("error");
      setMessage(
        error instanceof Error ? error.message : "Review could not be saved",
      );
    }
  }
  async function persistConflictResolution(input: {
    claimKey: string;
    selectedEvidenceId: string;
    rationale: string;
  }) {
    if (conflictState === "saving") return;
    setConflictState("saving");
    setMessage(null);
    try {
      const response = await fetch("/api/evidence/conflicts/resolve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw new Error(
          result.error ?? "Conflict resolution could not be saved",
        );
      setActiveConflicts((current) =>
        current.filter((conflict) => conflict.claimKey !== input.claimKey),
      );
      setMessage("Conflict resolution saved");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Conflict resolution could not be saved",
      );
    } finally {
      setConflictState("idle");
    }
  }
  const inspector = (
    <ReviewPanel
      activeRunId={activeRunId}
      busy={reviewState === "saving"}
      conflictBusy={conflictState === "saving"}
      conflicts={activeConflicts}
      onReview={(decision, value) => void persistReview(decision, value)}
      onResolveConflict={(input) => void persistConflictResolution(input)}
      organisationId={organisationId}
      selected={selected}
    />
  );
  return (
    <section className="mx-auto max-w-[1600px] space-y-4 pb-16">
      <header className="border-b-2 border-[#20221e] pb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#3157d5]">
          Evidence operations · live workspace
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl tracking-[-0.035em] text-[#20221e]">
              Evidence desk
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-[#62655d]">
              Review extracted claims against their original source before they
              can influence economics, committee citations, or decisions.
            </p>
          </div>
          <p className="border-l border-[#d8d8cf] pl-3 text-xs text-[#62655d]">
            {candidates.length} review-required · {activeConflicts.length}{" "}
            conflict
            {activeConflicts.length === 1 ? "" : "s"}
          </p>
        </div>
      </header>
      <div className="grid min-h-[620px] border border-[#cacbc3] bg-[#faf9f4] min-[1025px]:grid-cols-[280px_minmax(0,1fr)_330px]">
        <aside
          aria-label="Source queue"
          className="border-b border-[#d9d9d1] bg-[#f4f3ed] min-[1025px]:border-r min-[1025px]:border-b-0"
          role="region"
        >
          <div className="border-b border-[#d9d9d1] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#66695f]">
              Source queue
            </p>
          </div>
          <div className="divide-y divide-[#deded6]">
            {sources.map((source) => (
              <a
                className="block px-4 py-3 text-left hover:bg-[#ecece5]"
                href="/opportunities"
                key={source.id}
              >
                <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a8651b]">
                  {source.sourceStatus.replaceAll("_", " ")}
                </span>
                <span className="mt-1 block text-xs font-semibold text-[#282a25]">
                  {source.sourceName}
                </span>
                <span className="mt-1 block text-xs text-[#62655d]">
                  Open source intake to resume or recover
                </span>
              </a>
            ))}
            {candidates.map((candidate) => (
              <button
                className={`block w-full px-4 py-3 text-left transition-colors ${candidate.id === selectedId ? "bg-[#e5ebff] shadow-[inset_3px_0_0_#3157d5]" : "hover:bg-[#ecece5]"}`}
                key={candidate.id}
                onClick={() => {
                  setSelectedId(candidate.id);
                  setReviewState("idle");
                  setMessage(null);
                }}
                type="button"
              >
                <span className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#3157d5]">
                  {candidate.sourceStatus.replaceAll("_", " ")}
                  <span>{Math.round(candidate.confidence * 100)}%</span>
                </span>
                <span className="mt-1 block text-xs font-semibold text-[#282a25]">
                  {candidate.sourceName}
                </span>
                <span className="mt-1 line-clamp-2 block text-xs leading-5 text-[#62655d]">
                  {candidate.claim}
                </span>
              </button>
            ))}
            {candidates.length === 0 && sources.length === 0 ? (
              <p className="px-4 py-8 text-sm text-[#62655d]">
                No sources require review.
              </p>
            ) : null}
          </div>
        </aside>
        <div
          aria-label="Source canvas"
          className="bg-[#fffef9] p-5 sm:p-7"
          role="region"
        >
          {selected ? (
            <article className="mx-auto max-w-2xl">
              <div className="flex items-center justify-between border-b border-[#dad9cf] pb-3 text-xs text-[#62655d]">
                <span className="font-semibold text-[#242622]">
                  {selected.sourceName}
                </span>
                <span>{selected.locatorLabel}</span>
              </div>
              <p className="mt-8 font-serif text-lg leading-9 text-[#4c4e47]">
                The extracted representation remains linked to the original
                material.{" "}
                <mark
                  className="rounded-sm bg-[#fff0b8] px-1 text-[#20221e] outline outline-2 outline-[#e0b64d]"
                  data-trace-active="true"
                >
                  {selected.sourceExcerpt}
                </mark>{" "}
                The highlighted locator is the exact record now under review.
              </p>
              <div className="mt-8 border-y border-[#dad9cf] py-3 text-xs text-[#62655d]">
                Trace: queue item → {selected.locatorLabel} →{" "}
                {selected.claimKey}
              </div>
            </article>
          ) : (
            <p className="text-sm text-[#62655d]">Select a queued source.</p>
          )}
          {!desktopInspector && selected ? (
            <Dialog.Root>
              <Dialog.Trigger asChild>
                <button
                  className="mt-5 rounded-sm border border-[#3157d5] px-3 py-2 text-xs font-semibold text-[#3157d5]"
                  type="button"
                >
                  Open review inspector
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-[#20221e]/35" />
                <Dialog.Content
                  aria-describedby={undefined}
                  className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto bg-[#f7f6f0] shadow-2xl"
                >
                  <div className="flex items-center justify-between border-b border-[#d9d9d1] px-4 py-3">
                    <Dialog.Title className="text-sm font-semibold text-[#20221e]">
                      Provenance and review
                    </Dialog.Title>
                    <Dialog.Close className="rounded-sm px-2 py-1 text-xs font-semibold text-[#3157d5]">
                      Close
                    </Dialog.Close>
                  </div>
                  {inspector}
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          ) : null}
        </div>
        {desktopInspector ? (
          <aside
            aria-label="Provenance and review"
            className="border-t border-[#d9d9d1] bg-[#f7f6f0] min-[1025px]:border-t-0 min-[1025px]:border-l"
          >
            <div className="border-b border-[#d9d9d1] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#66695f]">
                Provenance &amp; review
              </p>
            </div>
            {inspector}
          </aside>
        ) : null}
      </div>
      {message ? (
        <p
          className={
            reviewState === "error"
              ? "text-sm text-[#ad3f3f]"
              : "text-sm text-[#25806a]"
          }
          role="status"
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
