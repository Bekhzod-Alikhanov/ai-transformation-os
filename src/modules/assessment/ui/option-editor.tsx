import { useState } from "react";
import type { SolutionOption } from "../types";
import type { SurfaceProps } from "./surface";
import { useDraft } from "./drafts";
import { Field, Select, ErrorMessage, errorText } from "./fields";
import { MetadataFields } from "./provenance";
import { OptionLines } from "./option-lines";
import { TaskEditor } from "./task-editor";
import {
  saveOption,
  inputLabels,
  fractionFields,
  type AssumptionMetadata,
} from "./investment-operations";
export function OptionEditor({
  option,
  ...props
}: SurfaceProps & { option: SolutionOption }) {
  const draft = useDraft(`${option.id}:base`, option);
  const original = useDraft(`${option.id}:base-source`, option);
  function edit(next: SolutionOption) {
    if (!draft.dirty) original.set(option);
    draft.set(next);
  }
  const meta = useDraft<AssumptionMetadata>(`${option.id}:base-metadata`, {
    owner: "",
    confidence: "low",
    evidenceIds: [],
  });
  const [error, setError] = useState("");
  const value = draft.value;
  return (
    <section className="aw-panel aw-stack">
      <h2>Base assumptions · {option.name}</h2>
      <p className="aw-muted">
        Blank means unknown. Comparison uses working drafts immediately.
        Baseline volume, time, hourly cost, productive hours and discount rate
        are shared: saving changes applies them to every option.
      </p>
      <fieldset
        disabled={props.busy || props.engagement.archived}
        className="aw-stack"
      >
        <TaskEditor value={value} onChange={edit} />
        <details>
          <summary>Option-specific suitability & controls</summary>
          <div className="aw-grid">
            {(["data", "technical"] as const).map((key) => (
              <Select
                key={key}
                label={`Option ${key} readiness`}
                value={value.readiness?.[key] ?? "unknown"}
                onChange={(s) =>
                  edit({
                    ...value,
                    readiness: {
                      data: "unknown",
                      technical: "unknown",
                      controlsOpen: false,
                      validationRequired: true,
                      ...value.readiness,
                      [key]: s as "unknown" | "ready" | "concern",
                    },
                  })
                }
              >
                <option value="unknown">Not assessed</option>
                <option value="ready">Ready</option>
                <option value="concern">Needs validation</option>
              </Select>
            ))}
          </div>
          <label className="aw-check">
            <input
              type="checkbox"
              checked={value.readiness?.controlsOpen ?? false}
              onChange={(ev) =>
                edit({
                  ...value,
                  readiness: {
                    data: "unknown",
                    technical: "unknown",
                    validationRequired: true,
                    ...value.readiness,
                    controlsOpen: ev.target.checked,
                  },
                })
              }
            />
            Critical controls unresolved for this option
          </label>
          <label className="aw-check">
            <input
              type="checkbox"
              checked={value.readiness?.validationRequired ?? false}
              onChange={(ev) =>
                edit({
                  ...value,
                  readiness: {
                    data: "unknown",
                    technical: "unknown",
                    controlsOpen: false,
                    ...value.readiness,
                    validationRequired: ev.target.checked,
                  },
                })
              }
            />
            Representative validation required for this option
          </label>
        </details>
        <div className="aw-grid">
          {(Object.keys(inputLabels) as (keyof typeof inputLabels)[]).map(
            (field) => (
              <Field
                key={field}
                label={inputLabels[field]}
                type="number"
                value={
                  value.inputs[field] === null
                    ? null
                    : value.inputs[field]! *
                      (fractionFields.has(field) ? 100 : 1)
                }
                onChange={(s) =>
                  edit({
                    ...value,
                    inputs: {
                      ...value.inputs,
                      [field]:
                        s === ""
                          ? null
                          : Number(s) / (fractionFields.has(field) ? 100 : 1),
                    },
                  })
                }
              />
            ),
          )}
        </div>
        <Field
          label="Labour cash mechanism"
          multiline
          value={value.cashMechanism}
          onChange={(cashMechanism) => edit({ ...value, cashMechanism })}
        />
        <Field
          label="Review cost allocation"
          multiline
          value={value.reviewAllocation}
          onChange={(reviewAllocation) => edit({ ...value, reviewAllocation })}
        />
        <OptionLines value={value} onChange={edit} />
        <MetadataFields
          opportunity={props.opportunity!}
          value={meta.value}
          onChange={meta.set}
        />
        <ErrorMessage error={error} />
        <div className="aw-actions">
          <button
            className="aw-primary"
            onClick={async () => {
              setError("");
              try {
                await props.save(
                  `Saved base assumptions: ${option.name}`,
                  (e) => {
                    const target = e.opportunities.find(
                      (o) => o.id === props.opportunity!.id,
                    )!;
                    Object.assign(
                      target,
                      saveOption(target, value, meta.value, original.value),
                    );
                  },
                );
                draft.reset();
                original.reset();
                meta.reset();
              } catch (cause) {
                setError(errorText(cause));
              }
            }}
          >
            Save base assumptions
          </button>
          <button
            onClick={() => {
              if (
                window.confirm(
                  "Discard this option's unsaved base assumptions?",
                )
              ) {
                draft.reset();
                original.reset();
                meta.reset();
              }
            }}
          >
            Discard base draft
          </button>
        </div>
      </fieldset>
    </section>
  );
}
