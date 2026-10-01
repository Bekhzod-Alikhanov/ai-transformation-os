import { useState } from "react";
import { materialFields } from "../assessment";
import type { Opportunity, SolutionOption } from "../types";
import type { SurfaceProps } from "./surface";
import { useDraft } from "./drafts";
import { Field, Select, ErrorMessage, errorText } from "./fields";
import {
  saveProvenance,
  type AssumptionMetadata,
} from "./investment-operations";

export function MetadataFields({
  opportunity,
  value,
  onChange,
}: {
  opportunity: Opportunity;
  value: AssumptionMetadata;
  onChange: (v: AssumptionMetadata) => void;
}) {
  return (
    <div className="aw-stack">
      <div className="aw-grid">
        <Field
          label="Assumption owner"
          value={value.owner}
          onChange={(owner) => onChange({ ...value, owner })}
        />
        <Select
          label="Assumption confidence"
          value={value.confidence}
          onChange={(confidence) =>
            onChange({
              ...value,
              confidence: confidence as AssumptionMetadata["confidence"],
            })
          }
        >
          {["low", "medium", "high"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </Select>
      </div>
      <fieldset>
        <legend>Supporting evidence</legend>
        {opportunity.evidence.length === 0 ? (
          <p className="aw-muted">
            No sources yet. Add evidence to support investment readiness.
          </p>
        ) : (
          opportunity.evidence.map((e) => (
            <label className="aw-check" key={e.id}>
              <input
                type="checkbox"
                checked={value.evidenceIds.includes(e.id)}
                onChange={(ev) =>
                  onChange({
                    ...value,
                    evidenceIds: ev.target.checked
                      ? [...value.evidenceIds, e.id]
                      : value.evidenceIds.filter((id) => id !== e.id),
                  })
                }
              />
              {e.title || "Untitled source"} · v{e.version} · {e.status}
            </label>
          ))
        )}
      </fieldset>
      <p className="aw-muted">
        Provenance: assumed. Ownership supports modelling; accepted material
        evidence is still required for investment readiness.
      </p>
    </div>
  );
}
export function Provenance({
  option,
  ...props
}: SurfaceProps & { option: SolutionOption }) {
  const o = props.opportunity!;
  const linked = o.assumptions.find((a) => a.id === props.recordId);
  const currentFields = materialFields(option).map((f) => f.field);
  const retiredFields = [
    ...new Set(
      o.assumptions
        .filter(
          (a) => a.optionId === option.id && !currentFields.includes(a.field),
        )
        .map((a) => a.field),
    ),
  ];
  const [field, setField] = useState(linked?.field ?? "adoption"),
    [error, setError] = useState("");
  const retired = !currentFields.includes(field);
  const latest = o.assumptions
    .filter((a) => a.optionId === option.id && a.field === field)
    .sort((a, b) => b.version - a.version)[0];
  const draft = useDraft<AssumptionMetadata>(
    `${option.id}:provenance:${field}`,
    {
      owner: latest?.owner ?? "",
      confidence: latest?.confidence ?? "low",
      evidenceIds: latest?.evidenceIds ?? [],
    },
  );
  return (
    <details className="aw-panel" open={linked ? true : undefined}>
      <summary>Assumption provenance & history</summary>
      <div className="aw-stack">
        <Select label="Assumption field" value={field} onChange={setField}>
          {currentFields.map((name) => (
            <option value={name} key={name}>
              {name}
            </option>
          ))}
          {retiredFields.map((name) => (
            <option key={name} value={name}>
              {name} — retired (read only)
            </option>
          ))}
        </Select>
        {retired ? (
          <p className="aw-muted">
            Retired field. Its recorded provenance remains available for
            read-only inspection.
          </p>
        ) : (
          <MetadataFields
            opportunity={o}
            value={draft.value}
            onChange={draft.set}
          />
        )}
        <ErrorMessage error={error} />
        <div className="aw-actions">
          {!retired && (
            <button
              disabled={props.busy}
              onClick={async () => {
                setError("");
                try {
                  await props.save("Updated assumption provenance", (e) => {
                    const target = e.opportunities.find((x) => x.id === o.id)!;
                    Object.assign(
                      target,
                      saveProvenance(target, option.id, field, draft.value),
                    );
                  });
                  draft.reset();
                } catch (cause) {
                  setError(errorText(cause));
                }
              }}
            >
              Save provenance
            </button>
          )}
          <button
            onClick={() =>
              props.inspect({
                title: `History: ${field}`,
                content: (
                  <ol>
                    {o.assumptions
                      .filter(
                        (a) => a.optionId === option.id && a.field === field,
                      )
                      .slice()
                      .reverse()
                      .map((a) => (
                        <li key={a.id}>
                          v{a.version} · {a.value ?? "Unknown"} {a.unit}
                          <br />
                          {a.owner || "No owner"} · {a.confidence} ·{" "}
                          {a.provenance}
                          <br />
                          {a.at}
                          {!a.material && <p>Retired at this revision</p>}
                          <ul>
                            {a.evidenceIds.map((id) => {
                              const e = o.evidence.find((x) => x.id === id);
                              return (
                                <li key={id}>
                                  {e
                                    ? `${e.title} · current v${e.version} · ${e.status}`
                                    : "Missing evidence"}
                                </li>
                              );
                            })}
                          </ul>
                        </li>
                      ))}
                  </ol>
                ),
              })
            }
          >
            Inspect assumption history
          </button>
        </div>
      </div>
    </details>
  );
}
