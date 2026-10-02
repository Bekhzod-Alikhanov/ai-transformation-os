import { useState } from "react";
import { newId } from "../model";
import type { WorkshopQuestion } from "../types";
import type { SurfaceProps } from "./surface";
import { Field, ErrorMessage, errorText } from "./fields";
import { useDraft } from "./drafts";
const questionBank: [WorkshopQuestion["area"], string][] = [
  ["workload", "What volume and handling time were actually measured?"],
  [
    "variation",
    "Which activities require judgment rather than deterministic rules?",
  ],
  ["data", "What usable sources, permissions and quality checks exist?"],
  ["quality", "What happens when an output is wrong?"],
  ["controls", "Who reviews outputs and controls exceptions?"],
  ["adoption", "How much review time and training will people need?"],
  ["value", "How does released capacity become useful work or cash savings?"],
];
export function Workshop(props: SurfaceProps) {
  if (!props.opportunity) return null;
  return <WorkshopContent key={props.opportunity.id} {...props} />;
}
function WorkshopContent(props: SurfaceProps) {
  const o = props.opportunity!;
  const [initial] = useState(
    () =>
      o.questions ??
      questionBank.map(([area, question]) => ({
        id: newId(),
        area,
        question,
        answer: "",
        owner: "",
        evidenceIds: [],
        unresolved: true,
      })),
  );
  const draft = useDraft(`${o.id}:questions`, o.questions ?? initial),
    [error, setError] = useState("");
  const edit = (id: string, patch: Partial<WorkshopQuestion>) =>
    draft.set(draft.value.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  return (
    <section className="aw-panel aw-stack">
      <p className="aw-eyebrow">02 / Discovery & traceability</p>
      <h1>Process & Evidence</h1>
      <p>
        Workshop answers establish context and readiness. They never silently
        overwrite a financial assumption.
      </p>
      <fieldset disabled={props.busy || props.engagement.archived}>
        <div className="aw-workshop-grid">
          {draft.value.map((q) => (
            <details
              key={q.id}
              className="aw-workshop-question"
              open={q.unresolved || q.area === "workload"}
            >
              <summary>
                {q.area.toUpperCase()} ·{" "}
                {q.unresolved ? "Needs validation" : "Reviewed answer"}
              </summary>
              <Field
                label={`Question · ${q.area}`}
                value={q.question}
                onChange={(question) => edit(q.id, { question })}
                multiline
              />
              <Field
                label={`Answer · ${q.area}`}
                value={q.answer}
                onChange={(answer) => edit(q.id, { answer })}
                multiline
              />
              <Field
                label={`Owner · ${q.area}`}
                value={q.owner}
                onChange={(owner) => edit(q.id, { owner })}
              />
              <label className="aw-check">
                <input
                  type="checkbox"
                  checked={q.unresolved}
                  onChange={(ev) =>
                    edit(q.id, { unresolved: ev.target.checked })
                  }
                />
                Unresolved · {q.area}
              </label>
              <fieldset>
                <legend>Supporting evidence · {q.area}</legend>
                {o.evidence.map((e) => (
                  <label className="aw-check" key={e.id}>
                    <input
                      type="checkbox"
                      checked={q.evidenceIds.includes(e.id)}
                      onChange={(ev) =>
                        edit(q.id, {
                          evidenceIds: ev.target.checked
                            ? [...q.evidenceIds, e.id]
                            : q.evidenceIds.filter((id) => id !== e.id),
                        })
                      }
                    />
                    {e.title} · {e.status}
                  </label>
                ))}
              </fieldset>
            </details>
          ))}
        </div>
        <button
          className="aw-primary"
          onClick={async () => {
            try {
              const questions = structuredClone(draft.value).map((q) => ({
                ...q,
                unresolved: q.unresolved || !q.answer.trim() || !q.owner.trim(),
              }));
              await props.save("Saved workshop answers", (e) => {
                e.opportunities.find((x) => x.id === o.id)!.questions =
                  questions;
              });
              draft.reset();
              setError("");
            } catch (cause) {
              setError(errorText(cause));
            }
          }}
        >
          Save workshop answers
        </button>
      </fieldset>
      <ErrorMessage error={error} />
    </section>
  );
}
