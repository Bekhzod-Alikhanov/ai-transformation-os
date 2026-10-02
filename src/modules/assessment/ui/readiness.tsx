import { useState } from "react";
import { assessOpportunity } from "../assessment";
import type { Opportunity } from "../types";
import type { SurfaceProps } from "./surface";
import { useDraft } from "./drafts";
import { Field, Select, ErrorMessage, errorText } from "./fields";
import { blockerTarget } from "./investment-operations";
type Readiness = Pick<
  Opportunity,
  | "feasibility"
  | "adoption"
  | "risk"
  | "criticalControlsOpen"
  | "economicHurdle"
  | "budgetCeiling"
  | "decisionPolicy"
>;
export function ReadinessControls(props: SurfaceProps) {
  const o = props.opportunity!;
  const draft = useDraft<Readiness>(`${o.id}:readiness`, {
    feasibility: o.feasibility,
    adoption: o.adoption,
    risk: o.risk,
    criticalControlsOpen: o.criticalControlsOpen,
    economicHurdle: o.economicHurdle,
    budgetCeiling: o.budgetCeiling,
    decisionPolicy: o.decisionPolicy ?? {
      objective: "economic",
      paybackCeiling: 24,
      npvHurdle: o.economicHurdle,
    },
  });
  const [error, setError] = useState("");
  const a = assessOpportunity(props.engagement, o),
    value = draft.value;
  return (
    <section className="aw-panel aw-stack">
      <h2>Readiness & decision gates</h2>
      <div className="aw-readiness">
        {Object.entries(a.dimensions).map(([key, state]) => (
          <div key={key}>
            <span>{key}</span>
            <strong className={`aw-state-${state}`}>
              {state === "concern" ? "Adverse / concern" : state}
            </strong>
          </div>
        ))}
      </div>
      <p>
        Policy outcome: <strong>{a.outcome}</strong>. {a.reasons.join(" ")}
      </p>
      <p className="aw-muted">
        Owned assumptions permit modelling. Investment-ready requires accepted
        support for material inputs. A clear critical-control checkbox alone
        does not complete risk assessment.
      </p>
      <div className="aw-grid">
        <Select
          label="Comparison objective"
          value={value.decisionPolicy!.objective}
          onChange={(objective) =>
            draft.set({
              ...value,
              decisionPolicy: {
                ...value.decisionPolicy!,
                objective: objective as "economic" | "cash",
              },
            })
          }
        >
          <option value="economic">
            Economic value (capacity + cash subset)
          </option>
          <option value="cash">Cash-only return</option>
        </Select>
        <Field
          label="Payback ceiling (months)"
          type="number"
          value={value.decisionPolicy!.paybackCeiling}
          onChange={(s) =>
            draft.set({
              ...value,
              decisionPolicy: {
                ...value.decisionPolicy!,
                paybackCeiling: s === "" ? NaN : Number(s),
              },
            })
          }
        />
        {(["feasibility", "adoption", "risk"] as const).map((key) => (
          <Select
            key={key}
            label={`${key[0].toUpperCase() + key.slice(1)} readiness`}
            value={value[key]}
            onChange={(v) =>
              draft.set({ ...value, [key]: v as Readiness[typeof key] })
            }
          >
            <option value="unknown">Unknown</option>
            <option value="ready">Ready</option>
            <option value="concern">Adverse / concern</option>
          </Select>
        ))}
        <Field
          label="Economic NPV hurdle"
          value={value.economicHurdle}
          onChange={(s) =>
            draft.set({
              ...value,
              economicHurdle: s.trim() === "" ? NaN : Number(s),
              decisionPolicy: {
                ...value.decisionPolicy!,
                npvHurdle: s.trim() === "" ? NaN : Number(s),
              },
            })
          }
        />
        <Field
          label="Initial investment budget ceiling"
          type="number"
          value={value.budgetCeiling}
          onChange={(s) =>
            draft.set({ ...value, budgetCeiling: s === "" ? null : Number(s) })
          }
        />
      </div>
      <label className="aw-check">
        <input
          type="checkbox"
          checked={value.criticalControlsOpen}
          onChange={(e) =>
            draft.set({ ...value, criticalControlsOpen: e.target.checked })
          }
        />
        Critical controls remain open
      </label>
      <ErrorMessage error={error} />
      <button
        disabled={props.busy}
        onClick={async () => {
          setError("");
          try {
            if (
              !Number.isFinite(value.economicHurdle) ||
              !Number.isFinite(value.decisionPolicy!.paybackCeiling) ||
              value.decisionPolicy!.paybackCeiling < 0 ||
              value.decisionPolicy!.paybackCeiling > 36 ||
              (value.budgetCeiling !== null &&
                (!Number.isFinite(value.budgetCeiling) ||
                  value.budgetCeiling < 0))
            )
              throw new Error(
                "Enter a finite economic hurdle and a nonnegative budget ceiling, or leave the budget unknown.",
              );
            await props.save("Updated readiness and economic gates", (e) => {
              Object.assign(
                e.opportunities.find((x) => x.id === o.id)!,
                value,
              );
            });
            draft.reset();
          } catch (cause) {
            setError(errorText(cause));
          }
        }}
      >
        Save readiness
      </button>
      {a.blockers.length > 0 && (
        <details>
          <summary>Resolve {a.blockers.length} blockers</summary>
          <ul>
            {a.blockers.map((b, i) => (
              <li key={i}>
                {b.message}{" "}
                <button onClick={() => props.navigate(blockerTarget(o, b))}>
                  Review{" "}
                  {b.section === "brief"
                    ? "readiness"
                    : blockerTarget(o, b).section === "options" &&
                        b.section === "evidence"
                      ? "provenance"
                      : b.section}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
