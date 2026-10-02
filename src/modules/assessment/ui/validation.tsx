import { useState } from "react";
import { validationPlanSchema } from "../types";
import type { SurfaceProps } from "./surface";
import { useDraft } from "./drafts";
import { Field, ErrorMessage, errorText } from "./fields";
import { generateValidation } from "../validation";
const prompts = {
  hypotheses:
    "Who uses the output, who could be harmed, and where is its use inappropriate?",
  baseline: "What representative comparison will the trial record?",
  thresholds:
    "What quality threshold and known limitations will the trial record?",
  method: "How will the comparison be measured and reviewed?",
  owner: "Who reviews outputs and owns intervention?",
  controls: "What human review and intervention controls are required?",
  stopCriteria:
    "What failure triggers stopping or reverting to a manual process?",
};
export function Validation(props: SurfaceProps) {
  const o = props.opportunity!,
    draft = useDraft(`${o.id}:validation`, o.validation),
    [error, setError] = useState("");
  return (
    <section className="aw-panel aw-stack">
      <h2>Validation handover</h2>
      <button
        disabled={props.busy || props.engagement.archived}
        onClick={() => {
          if (
            draft.dirty &&
            !window.confirm(
              "Replace the unsaved validation draft with generated suggestions?",
            )
          )
            return;
          draft.set(generateValidation(props.engagement, o));
        }}
      >
        Generate plan from this case
      </button>
      <p className="aw-muted">
        Generated thresholds are suggestions. Review ownership, budget and
        measurement method, then save explicitly.
      </p>
      {(!draft.value.owner.trim() || !draft.value.thresholds.trim()) && (
        <p className="aw-callout">
          Incomplete handover: assign an owner and success thresholds.
        </p>
      )}
      <p className="aw-muted">
        Advisory planning, not approval. These prompts draw on the voluntary
        NIST AI RMF; this workbench does not implement the full framework or
        certify compliance.
      </p>
      <div className="aw-grid">
        {(Object.keys(prompts) as (keyof typeof prompts)[]).map((key) => (
          <div key={key}>
            <Field
              label={`Validation ${key === "stopCriteria" ? "stop criteria" : key}`}
              multiline
              value={draft.value[key]}
              onChange={(s) => draft.set({ ...draft.value, [key]: s })}
            />
            <p className="aw-muted">{prompts[key]}</p>
          </div>
        ))}
        <Field
          label="Validation budget ceiling"
          type="number"
          value={draft.value.budgetCeiling}
          onChange={(s) =>
            draft.set({
              ...draft.value,
              budgetCeiling: s === "" ? null : Number(s),
            })
          }
        />
      </div>
      <ErrorMessage error={error} />
      <button
        disabled={props.busy}
        onClick={async () => {
          setError("");
          try {
            const validated = validationPlanSchema.parse(draft.value);
            await props.save("Saved validation handover", (e) => {
              e.opportunities.find((x) => x.id === o.id)!.validation =
                validated;
            });
            draft.reset();
          } catch (cause) {
            setError(errorText(cause));
          }
        }}
      >
        Save validation handover
      </button>
      <a
        href="https://www.nist.gov/itl/ai-risk-management-framework"
        target="_blank"
        rel="noreferrer"
      >
        NIST AI RMF context
      </a>
    </section>
  );
}
