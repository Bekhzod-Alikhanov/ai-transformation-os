import { useState } from "react";
import {
  createEngagement,
  createWorkspace,
  duplicateEngagement,
  isRecommendationStale,
  reviseEngagement,
} from "../model";
import { createTemplate } from "../templates";
import type { Engagement, Workspace } from "../types";
import type { NavigationTarget } from "./surface";
import { Field, ErrorMessage, errorText } from "./fields";
import { useDraft, useDrafts } from "./drafts";
import {
  BrandSettings,
  LegacyMigration,
  type CommitWorkspace,
} from "./recovery";

export function WorkQueue({
  workspace,
  commit,
  busy,
  navigate,
}: {
  workspace: Workspace | null;
  commit: CommitWorkspace;
  busy: boolean;
  navigate: (target: NavigationTarget) => void;
}) {
  const name = useDraft("new-engagement", "");
  const drafts = useDrafts();
  const [archived, setArchived] = useState(false),
    [error, setError] = useState("");
  async function add(engagement: Engagement, consumesNameDraft = false) {
    try {
      if (!engagement.name.trim())
        throw new Error("Name the engagement before creating it.");
      await commit((current) => ({
        ...(current ?? createWorkspace()),
        engagements: [...(current?.engagements ?? []), engagement],
      }));
      if (consumesNameDraft) name.reset();
      navigate({ section: "brief", engagementId: engagement.id });
      setError("");
    } catch (cause) {
      setError(errorText(cause));
    }
  }
  return (
    <div className="aw-stack">
      <section className="aw-panel">
        <p className="aw-eyebrow">Consulting assessment / local workspace</p>
        <h1>{workspace ? "Engagement work queue" : "Start an assessment"}</h1>
        <p>
          Frame the decision, collect evidence, and make the unknowns visible.
          Use synthetic information only.
        </p>
        <form
          className="aw-inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            void add(createEngagement(name.value.trim()), true);
          }}
        >
          <Field
            label="New engagement name"
            required
            value={name.value}
            onChange={name.set}
          />
          <button className="aw-primary" disabled={busy}>
            Create blank engagement
          </button>
        </form>
        <div className="aw-template-grid">
          <div>
            <h2>Support operations</h2>
            <p>
              Synthetic triage baseline, competing options and a reduction
              estimate to resolve.
            </p>
            <button
              disabled={busy}
              onClick={() => void add(createTemplate("support"))}
            >
              Use support template
            </button>
          </div>
          <div>
            <h2>Monthly reporting</h2>
            <p>
              Synthetic preparation workload, human review and capacity value.
            </p>
            <button
              disabled={busy}
              onClick={() => void add(createTemplate("reporting"))}
            >
              Use reporting template
            </button>
          </div>
        </div>
        <ErrorMessage error={error} />
      </section>
      {!workspace && <LegacyMigration commit={commit} busy={busy} />}
      {workspace && (
        <>
          <section className="aw-panel aw-stack">
            <div className="aw-section-heading">
              <h2>Engagements</h2>
              <label className="aw-check">
                <input
                  type="checkbox"
                  checked={archived}
                  onChange={(e) => setArchived(e.target.checked)}
                />
                Show archived
              </label>
            </div>
            {workspace.engagements
              .filter((e) => archived || !e.archived)
              .map((e) => (
                <article className="aw-queue-record" key={e.id}>
                  <div className="aw-section-heading">
                    <div>
                      <h3>
                        <button
                          onClick={() =>
                            navigate({ section: "brief", engagementId: e.id })
                          }
                        >
                          {e.name}
                        </button>
                      </h3>
                      <p>
                        {e.client || "Client not entered"} · {e.currency} ·{" "}
                        {e.archived ? "Archived" : "Active"} · deadline{" "}
                        {e.decisionDeadline || "not set"}
                      </p>
                    </div>
                    <div className="aw-actions">
                      <button
                        disabled={busy}
                        onClick={() => void add(duplicateEngagement(e))}
                      >
                        Duplicate {e.name}
                      </button>
                      <button
                        disabled={busy}
                        onClick={async () => {
                          if (
                            !e.archived &&
                            drafts.dirty &&
                            !window.confirm(
                              "Archive this engagement? Unsaved drafts will remain in memory and are excluded from the saved archive. Continue?",
                            )
                          )
                            return;
                          try {
                            await commit((current) => ({
                              ...current!,
                              engagements: current!.engagements.map((x) =>
                                x.id === e.id
                                  ? reviseEngagement(
                                      x,
                                      e.archived
                                        ? "Restored engagement"
                                        : "Archived engagement",
                                      (draft) => {
                                        draft.archived = !e.archived;
                                      },
                                    )
                                  : x,
                              ),
                            }));
                            setError("");
                          } catch (cause) {
                            setError(errorText(cause));
                          }
                        }}
                      >
                        {e.archived ? "Restore" : "Archive"} {e.name}
                      </button>
                    </div>
                  </div>
                  {!e.opportunities.length && (
                    <p>No opportunities yet. Open the brief to add one.</p>
                  )}
                  {e.opportunities.map((o) => (
                    <div className="aw-queue-issues" key={o.id}>
                      <strong>{o.name}</strong>
                      <button
                        onClick={() =>
                          navigate({
                            section: "evidence",
                            engagementId: e.id,
                            opportunityId: o.id,
                          })
                        }
                      >
                        Unknown / pending evidence:{" "}
                        {
                          o.evidence.filter(
                            (x) =>
                              x.status === "missing" || x.status === "pending",
                          ).length
                        }
                        {!o.evidence.length ? " · no sources" : ""}
                      </button>
                      <button
                        onClick={() =>
                          navigate({
                            section: "evidence",
                            engagementId: e.id,
                            opportunityId: o.id,
                            recordId: o.evidence.find(
                              (x) => x.status === "conflicted",
                            )?.id,
                          })
                        }
                      >
                        Conflicted:{" "}
                        {
                          o.evidence.filter((x) => x.status === "conflicted")
                            .length
                        }
                      </button>
                      <button
                        onClick={() =>
                          navigate({
                            section: "recommendation",
                            engagementId: e.id,
                            opportunityId: o.id,
                          })
                        }
                      >
                        Stale recommendations:{" "}
                        {
                          o.recommendations.filter((r) =>
                            isRecommendationStale(o, r),
                          ).length
                        }
                      </button>
                    </div>
                  ))}
                </article>
              ))}
          </section>
          <BrandSettings workspace={workspace} busy={busy} commit={commit} />
        </>
      )}
    </div>
  );
}
