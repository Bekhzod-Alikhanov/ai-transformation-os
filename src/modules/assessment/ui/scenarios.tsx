import { useState } from "react";
import { calculateOption, sensitivityOption } from "../economics";
import { newId } from "../model";
import { scenarioSchema, type SolutionOption, type Scenario } from "../types";
import type { SurfaceProps } from "./surface";
import { useDraft } from "./drafts";
import { inputLabels, fractionFields } from "./investment-operations";
import { Field, Select, ErrorMessage, errorText } from "./fields";
import { FinancialResults, formatMetric } from "./financial-results";
export function Scenarios({
  option,
  bau,
  ...props
}: SurfaceProps & { option: SolutionOption; bau: SolutionOption }) {
  const [selected, setSelected] = useState("base"),
    [error, setError] = useState("");
  const [sensitivity, setSensitivity] = useState<ReturnType<
    typeof sensitivityOption
  > | null>(null);
  const custom = useDraft<Scenario>(`${option.id}:scenario`, {
    id: "",
    name: "",
    inputPatch: {},
    costMultiplier: 1,
    benefitMultiplier: 1,
  });
  const builtins: Scenario[] = [
    {
      id: "conservative",
      name: "Conservative what-if",
      inputPatch: {
        adoption:
          option.inputs.adoption === null
            ? null
            : option.inputs.adoption * 0.75,
      },
      costMultiplier: 1.2,
      benefitMultiplier: 0.9,
    },
    {
      id: "upside",
      name: "Upside what-if",
      inputPatch: {
        adoption:
          option.inputs.adoption === null
            ? null
            : Math.min(1, option.inputs.adoption * 1.15),
      },
      costMultiplier: 0.9,
      benefitMultiplier: 1.1,
    },
  ];
  const scenarios = [...builtins, ...option.scenarios];
  const scenario =
    selected === "base"
      ? undefined
      : selected === "custom"
        ? custom.value
        : scenarios.find((x) => x.id === selected);
  return (
    <div className="aw-stack">
      <section className="aw-panel aw-stack">
        <h2>What-if analysis</h2>
        <p>
          Scenarios do not change the saved base or the recommendation basis.
          Change the investment basis only by saving base assumptions with
          provenance.
        </p>
        <Select
          label="Scenario comparison"
          value={selected}
          onChange={setSelected}
        >
          <option value="base">Saved base</option>
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
          <option value="custom">Custom draft</option>
        </Select>
        <details>
          <summary>Compose a custom scenario</summary>
          <div className="aw-stack">
            <Field
              label="Scenario name"
              value={custom.value.name}
              onChange={(name) => custom.set({ ...custom.value, name })}
            />
            <div className="aw-grid">
              <Field
                label="Scenario cost multiplier"
                type="number"
                value={custom.value.costMultiplier}
                onChange={(s) =>
                  custom.set({
                    ...custom.value,
                    costMultiplier: s === "" ? NaN : Number(s),
                  })
                }
              />
              <Field
                label="Scenario benefit multiplier"
                type="number"
                value={custom.value.benefitMultiplier}
                onChange={(s) =>
                  custom.set({
                    ...custom.value,
                    benefitMultiplier: s === "" ? NaN : Number(s),
                  })
                }
              />
              {(Object.keys(inputLabels) as (keyof typeof inputLabels)[]).map(
                (field) => (
                  <Field
                    key={field}
                    label={`Override ${inputLabels[field]}`}
                    type="number"
                    value={
                      custom.value.inputPatch[field] === undefined ||
                      custom.value.inputPatch[field] === null
                        ? null
                        : custom.value.inputPatch[field]! *
                          (fractionFields.has(field) ? 100 : 1)
                    }
                    onChange={(s) => {
                      const patch = { ...custom.value.inputPatch };
                      if (s === "") delete patch[field];
                      else
                        patch[field] =
                          Number(s) / (fractionFields.has(field) ? 100 : 1);
                      custom.set({ ...custom.value, inputPatch: patch });
                    }}
                  />
                ),
              )}
            </div>
            <p className="aw-muted">
              Blank overrides inherit the base. Shared baseline overrides must
              still match BAU; mismatches are reported, never silently changed.
            </p>
            <button
              disabled={props.busy}
              onClick={async () => {
                setError("");
                try {
                  if (!custom.value.name.trim())
                    throw new Error("Name the custom scenario.");
                  const next = scenarioSchema.parse({
                    ...custom.value,
                    id: newId(),
                  });
                  await props.save("Saved custom what-if scenario", (e) => {
                    e.opportunities
                      .find((x) => x.id === props.opportunity!.id)!
                      .options.find((x) => x.id === option.id)!
                      .scenarios.push(next);
                  });
                  custom.reset();
                  setSelected(next.id);
                } catch (cause) {
                  setError(errorText(cause));
                }
              }}
            >
              Save custom scenario
            </button>
          </div>
        </details>
        <ErrorMessage error={error} />
        {option.kind === "bau" ? (
          <p className="aw-muted">
            BAU self-comparison is the zero incremental reference. Sensitivity
            and simulation are available for alternatives.
          </p>
        ) : (
          <>
            <button
              onClick={() => {
                setError("");
                try {
                  setSensitivity(sensitivityOption(option, bau));
                } catch (cause) {
                  setSensitivity(null);
                  setError(errorText(cause));
                }
              }}
            >
              Calculate base sensitivity
            </button>
            {sensitivity && (
              <div
                className="aw-scroll"
                tabIndex={0}
                role="region"
                aria-label="Sensitivity comparison table"
              >
                <table>
                  <caption>
                    Saved base sensitivity · NPV at low / high values
                  </caption>
                  <thead>
                    <tr>
                      <th>Driver</th>
                      <th>Low NPV</th>
                      <th>High NPV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(sensitivity).map(([key, value]) => (
                      <tr key={key}>
                        <th>
                          {key}{" "}
                          {key === "costMultiplier"
                            ? "0.8× / 1.2×"
                            : "−10 / +10 percentage points (bounded)"}
                        </th>
                        <td>
                          {formatMetric(
                            value.low,
                            "money",
                            props.engagement.currency,
                          )}
                        </td>
                        <td>
                          {formatMetric(
                            value.high,
                            "money",
                            props.engagement.currency,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
      <FinancialResults
        result={calculateOption(
          option,
          bau,
          scenario
            ? { ...scenario, id: scenario.id || "custom-preview" }
            : undefined,
        )}
        currency={props.engagement.currency}
        title={
          selected === "base"
            ? "Saved base results"
            : `What-if results · ${scenario?.name || "Custom draft"}`
        }
      />
    </div>
  );
}
