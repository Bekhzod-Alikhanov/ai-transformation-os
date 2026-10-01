import type { ProcessStep } from "../types";
import { newId } from "../model";
import { Field, Select } from "./fields";

export function ProcessEditor({
  steps,
  change,
}: {
  steps: ProcessStep[];
  change: (steps: ProcessStep[]) => void;
}) {
  function update(id: string, patch: Partial<ProcessStep>) {
    change(steps.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  return (
    <section className="aw-stack">
      <h3>Current and future process</h3>
      <p className="aw-muted">
        Process notes do not change numeric model assumptions. Blank volumes and
        times remain unknown.
      </p>
      <div
        className="aw-scroll"
        role="region"
        aria-label="Process steps"
        tabIndex={0}
      >
        <table>
          <caption className="aw-sr">Editable process steps</caption>
          <thead>
            <tr>
              {[
                "State",
                "Step",
                "Actor",
                "Annual volume",
                "Minutes",
                "Exceptions",
                "Review",
                "Action",
              ].map((x) => (
                <th key={x}>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {steps.map((s, i) => (
              <tr key={s.id}>
                <td>
                  <Select
                    label={`Step ${i + 1} state`}
                    value={s.state}
                    onChange={(state) =>
                      update(s.id, { state: state as ProcessStep["state"] })
                    }
                  >
                    <option value="current">Current</option>
                    <option value="future">Future</option>
                  </Select>
                </td>
                {(
                  [
                    "name",
                    "actor",
                    "annualVolume",
                    "minutes",
                    "exceptions",
                    "review",
                  ] as const
                ).map((key) => (
                  <td key={key}>
                    <Field
                      label={`Step ${i + 1} ${key}`}
                      value={s[key]}
                      type={
                        key === "annualVolume" || key === "minutes"
                          ? "number"
                          : "text"
                      }
                      onChange={(value) =>
                        update(s.id, {
                          [key]:
                            key === "annualVolume" || key === "minutes"
                              ? value === ""
                                ? null
                                : Number(value)
                              : value,
                        })
                      }
                    />
                  </td>
                ))}
                <td className="aw-process-action">
                  <button
                    type="button"
                    onClick={() => {
                      const populated =
                        s.name ||
                        s.actor ||
                        s.annualVolume !== null ||
                        s.minutes !== null ||
                        s.exceptions ||
                        s.review;
                      if (
                        !populated ||
                        window.confirm(
                          "Remove this populated process step from the draft?",
                        )
                      )
                        change(steps.filter((x) => x.id !== s.id));
                    }}
                  >
                    Remove step {i + 1}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() =>
          change([
            ...steps,
            {
              id: newId(),
              state: "current",
              name: "",
              actor: "",
              annualVolume: null,
              minutes: null,
              exceptions: "",
              review: "",
            },
          ])
        }
      >
        Add process step
      </button>
    </section>
  );
}
