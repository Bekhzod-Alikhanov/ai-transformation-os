import { useState } from "react";
import { newId } from "../model";
import type { Evidence as EvidenceRecord } from "../types";
import type { SurfaceProps } from "./surface";
import { useDraft } from "./drafts";
import { saveEvidence, reviewEvidence } from "./operations";
import { Field, Select, ErrorMessage, errorText } from "./fields";
import { BaselineImport } from "./baseline-import";

export function Evidence(props: SurfaceProps) {
  const { opportunity } = props;
  const [selected, setSelected] = useState(
    props.recordId ?? opportunity?.evidence[0]?.id ?? "new",
  );
  if (!opportunity)
    return (
      <section className="aw-panel">
        <h2 className="aw-surface-title">Evidence</h2>
        <p>Create and select an opportunity in Brief to collect evidence.</p>
        <button onClick={() => props.navigate({ section: "brief" })}>
          Open Brief
        </button>
      </section>
    );
  const source = opportunity.evidence.find((e) => e.id === selected);
  return (
    <div className="aw-stack">
      <section className="aw-panel">
        <p className="aw-eyebrow">02 / Establish what is known</p>
        <h2 className="aw-surface-title">Evidence review</h2>
        <p>
          Accepted means a human reviewed the source. It is not proof, model
          validation, or approval. Review alone never changes numeric
          assumptions.
        </p>
        <div className="aw-evidence-grid">
          <nav aria-label="Evidence sources" className="aw-source-list">
            {opportunity.evidence.map((e) => (
              <button
                key={e.id}
                aria-pressed={selected === e.id}
                onClick={() => setSelected(e.id)}
              >
                <strong>{e.title || "Untitled source"}</strong>
                <small>
                  {e.status} · version {e.version}
                </small>
              </button>
            ))}
            <button onClick={() => setSelected("new")}>
              Add manual evidence
            </button>
          </nav>
          <EvidenceEditor
            key={selected}
            {...props}
            source={source}
            onCreated={setSelected}
          />
        </div>
      </section>
      <EvidenceRequests {...props} />
      <BaselineImport {...props} />
    </div>
  );
}

function EvidenceEditor({
  opportunity,
  engagement,
  save,
  inspect,
  busy,
  source,
  onCreated,
}: SurfaceProps & {
  source?: EvidenceRecord;
  onCreated: (id: string) => void;
}) {
  const initial: EvidenceRecord = source ?? {
    id: newId(),
    title: "",
    excerpt: "",
    source: "",
    locator: "",
    date: "",
    status: "missing",
    reviewRationale: "",
    reviewedAt: "",
    version: 0,
    internalNote: "",
  };
  const draft = useDraft(
    `evidence:${opportunity!.id}:${source?.id ?? "new"}`,
    initial,
  );
  const rationale = useDraft(`review:${source?.id ?? opportunity!.id}`, "");
  const [error, setError] = useState("");
  async function review(status: "accepted" | "rejected" | "conflicted") {
    try {
      if (draft.dirty)
        throw new Error(
          "Save source edits before reviewing the new evidence version.",
        );
      await save(`Reviewed evidence: ${status}`, (next) => {
        const i = next.opportunities.findIndex((o) => o.id === opportunity!.id);
        next.opportunities[i] = reviewEvidence(
          next.opportunities[i],
          source!.id,
          status,
          rationale.value,
        );
      });
      rationale.reset();
      setError("");
    } catch (cause) {
      setError(errorText(cause));
    }
  }
  return (
    <div className="aw-stack">
      <div className="aw-section-heading">
        <h3>{source ? "Source record" : "New manual evidence"}</h3>
        {source && (
          <button
            onClick={() =>
              inspect({
                title: "Source inspector",
                content: (
                  <>
                    <h3>{source.title || "Untitled source"}</h3>
                    <p>{source.source || "Source unknown"}</p>
                    <p>{source.locator || "Locator unknown"}</p>
                    <blockquote>{source.excerpt || "No excerpt"}</blockquote>
                    <p>
                      Status: {source.status} · version {source.version}
                    </p>
                    <p>
                      Confidence: unknown · provenance:{" "}
                      {source.source
                        ? "Source entered by practitioner; not independently verified"
                        : "unknown"}
                    </p>
                    <p>Review: {source.reviewRationale || "Not reviewed"}</p>
                    <h3>Internal note</h3>
                    <p>{source.internalNote || "None"}</p>
                  </>
                ),
              })
            }
          >
            Inspect source
          </button>
        )}
      </div>
      <p>Review status: {source?.status ?? "missing"}</p>
      <p className="aw-muted">
        Confidence: unknown until assessed. A source label does not establish
        provenance.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            if (!draft.value.title.trim())
              throw new Error("Name this evidence source.");
            const value = draft.value;
            await save("Saved evidence source version", (next) => {
              const i = next.opportunities.findIndex(
                (o) => o.id === opportunity!.id,
              );
              next.opportunities[i] = saveEvidence(
                next.opportunities[i],
                value,
              );
            });
            draft.reset();
            onCreated(value.id);
            setError("");
          } catch (cause) {
            setError(errorText(cause));
          }
        }}
      >
        <fieldset disabled={busy || engagement.archived} className="aw-stack">
          <legend className="aw-sr">Source fields</legend>
          {(
            [
              ["title", "Evidence title"],
              ["source", "Source"],
              ["locator", "Source locator"],
              ["date", "Source date"],
              ["excerpt", "Source excerpt"],
              ["internalNote", "Internal note"],
            ] as const
          ).map(([key, label]) => (
            <Field
              key={key}
              label={label}
              value={draft.value[key]}
              required={key === "title"}
              type={key === "date" ? "date" : "text"}
              multiline={key === "excerpt" || key === "internalNote"}
              onChange={(value) => draft.set({ ...draft.value, [key]: value })}
            />
          ))}
          <p className="aw-muted">
            Saving edits creates a new version and returns it to pending (or
            missing if no source). Internal notes are included in workspace
            backups.
          </p>
          <button className="aw-primary">Save evidence</button>
        </fieldset>
      </form>
      {source && (
        <fieldset disabled={busy || engagement.archived} className="aw-stack">
          <legend>Human review</legend>
          <Field
            label="Review rationale"
            value={rationale.value}
            multiline
            onChange={rationale.set}
          />
          <div className="aw-actions">
            <button
              disabled={!rationale.value.trim() || draft.dirty}
              onClick={() => void review("accepted")}
            >
              Accept evidence
            </button>
            <button
              disabled={!rationale.value.trim() || draft.dirty}
              onClick={() => void review("rejected")}
            >
              Reject evidence
            </button>
            <button
              disabled={!rationale.value.trim() || draft.dirty}
              onClick={() => void review("conflicted")}
            >
              Mark conflicted
            </button>
          </div>
        </fieldset>
      )}
      <ErrorMessage error={error} />
    </div>
  );
}

function EvidenceRequests({
  opportunity,
  engagement,
  save,
  busy,
}: SurfaceProps) {
  const draft = useDraft(`requests:${opportunity!.id}`, opportunity!.requests);
  const [error, setError] = useState("");
  return (
    <section className="aw-panel">
      <h2>Outstanding questions</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await save("Updated evidence requests", (next) => {
              next.opportunities.find(
                (o) => o.id === opportunity!.id,
              )!.requests = draft.value;
            });
            draft.reset();
            setError("");
          } catch (cause) {
            setError(errorText(cause));
          }
        }}
      >
        <fieldset disabled={busy || engagement.archived} className="aw-stack">
          <legend className="aw-sr">Evidence requests</legend>
          {draft.value.map((item, i) => (
            <div className="aw-request aw-grid" key={item.id}>
              {(
                [
                  ["question", "Question"],
                  ["owner", "Owner"],
                  ["impact", "Decision impact"],
                ] as const
              ).map(([key, label]) => (
                <Field
                  key={key}
                  label={`Request ${i + 1} ${label}`}
                  value={item[key]}
                  onChange={(value) =>
                    draft.set(
                      draft.value.map((x) =>
                        x.id === item.id ? { ...x, [key]: value } : x,
                      ),
                    )
                  }
                />
              ))}
              <Select
                label={`Request ${i + 1} status`}
                value={item.status}
                onChange={(status) =>
                  draft.set(
                    draft.value.map((x) =>
                      x.id === item.id
                        ? { ...x, status: status as "open" | "closed" }
                        : x,
                    ),
                  )
                }
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </Select>
            </div>
          ))}
          {!draft.value.length && (
            <p>No requests recorded. Unknown evidence remains unassessed.</p>
          )}
          <div className="aw-actions">
            <button
              type="button"
              onClick={() =>
                draft.set([
                  ...draft.value,
                  {
                    id: newId(),
                    question: "",
                    owner: "",
                    impact: "",
                    status: "open",
                  },
                ])
              }
            >
              Add evidence request
            </button>
            <button className="aw-primary">Save requests</button>
          </div>
        </fieldset>
      </form>
      <ErrorMessage error={error} />
    </section>
  );
}
