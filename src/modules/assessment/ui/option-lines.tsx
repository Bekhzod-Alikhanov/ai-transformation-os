import { newId } from "../model";
import type { SolutionOption, CostLine, BenefitLine } from "../types";
import { Field, Select } from "./fields";
export function OptionLines({
  value,
  onChange,
}: {
  value: SolutionOption;
  onChange: (v: SolutionOption) => void;
}) {
  function cost(id: string, patch: Partial<CostLine>) {
    onChange({
      ...value,
      costs: value.costs.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  }
  function benefit(id: string, patch: Partial<BenefitLine>) {
    onChange({
      ...value,
      benefits: value.benefits.map((b) =>
        b.id === id ? { ...b, ...patch } : b,
      ),
    });
  }
  return (
    <div className="aw-stack">
      <details>
        <summary>Explicit cost lines ({value.costs.length})</summary>
        <div className="aw-stack">
          {value.costs.map((c, i) => (
            <fieldset className="aw-request" key={c.id}>
              <legend>Cost {i + 1}</legend>
              <div className="aw-grid">
                <Field
                  label={`Cost ${i + 1} name`}
                  value={c.name}
                  onChange={(name) => cost(c.id, { name })}
                />
                <Field
                  label={`Cost ${i + 1} amount`}
                  type="number"
                  value={c.amount}
                  onChange={(s) =>
                    cost(c.id, { amount: s === "" ? null : Number(s) })
                  }
                />
                <Select
                  label={`Cost ${i + 1} category`}
                  value={c.category}
                  onChange={(category) =>
                    cost(c.id, { category: category as CostLine["category"] })
                  }
                >
                  {[
                    "discovery",
                    "data",
                    "implementation",
                    "change",
                    "technology",
                    "operations",
                    "review",
                    "other",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </Select>
                <Select
                  label={`Cost ${i + 1} frequency`}
                  value={c.frequency}
                  onChange={(frequency) =>
                    cost(c.id, {
                      frequency: frequency as CostLine["frequency"],
                    })
                  }
                >
                  {["one_time", "monthly", "annual"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </Select>
                <Field
                  label={`Cost ${i + 1} start month`}
                  type="number"
                  value={c.startMonth}
                  onChange={(s) =>
                    cost(c.id, { startMonth: s === "" ? NaN : Number(s) })
                  }
                />
                <Field
                  label={`Cost ${i + 1} end month`}
                  type="number"
                  value={c.endMonth}
                  onChange={(s) =>
                    cost(c.id, { endMonth: s === "" ? NaN : Number(s) })
                  }
                />
                <Select
                  label={`Cost ${i + 1} accounting`}
                  value={c.accounting}
                  onChange={(accounting) =>
                    cost(c.id, {
                      accounting: accounting as CostLine["accounting"],
                    })
                  }
                >
                  {["unclassified", "capex", "opex"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </Select>
              </div>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...value,
                    costs: value.costs.filter((x) => x.id !== c.id),
                  })
                }
              >
                Remove cost {i + 1}
              </button>
            </fieldset>
          ))}
          <button
            type="button"
            onClick={() =>
              onChange({
                ...value,
                costs: [
                  ...value.costs,
                  {
                    id: newId(),
                    name: "",
                    category: "other",
                    amount: null,
                    frequency: "one_time",
                    startMonth: 0,
                    endMonth: 0,
                    accounting: "unclassified",
                  },
                ],
              })
            }
          >
            Add cost line
          </button>
        </div>
      </details>
      <details>
        <summary>
          Quality & contribution margin benefits ({value.benefits.length})
        </summary>
        <p className="aw-muted">
          Annual potential before adoption and ramp scaling. Cash is a subset of
          economic value, never an additional benefit. Shared pools require
          allocated non-overlapping amounts and an explanation.
        </p>
        <div className="aw-stack">
          {value.benefits.map((b, i) => (
            <fieldset className="aw-request" key={b.id}>
              <legend>Benefit {i + 1}</legend>
              <div className="aw-grid">
                <Field
                  label={`Benefit ${i + 1} name`}
                  value={b.name}
                  onChange={(name) => benefit(b.id, { name })}
                />
                <Select
                  label={`Benefit ${i + 1} kind`}
                  value={b.kind}
                  onChange={(kind) =>
                    benefit(b.id, { kind: kind as BenefitLine["kind"] })
                  }
                >
                  <option value="quality">Quality</option>
                  <option value="revenue">Contribution margin</option>
                </Select>
                <Field
                  label={`Benefit ${i + 1} annual potential`}
                  type="number"
                  value={b.annualAmount}
                  onChange={(s) =>
                    benefit(b.id, { annualAmount: s === "" ? null : Number(s) })
                  }
                />
                <Field
                  label={`Benefit ${i + 1} pool`}
                  value={b.pool}
                  onChange={(pool) => benefit(b.id, { pool })}
                />
                <Field
                  label={`Benefit ${i + 1} cash share (%)`}
                  type="number"
                  value={b.cashShare * 100}
                  onChange={(s) =>
                    benefit(b.id, {
                      cashShare: s === "" ? NaN : Number(s) / 100,
                    })
                  }
                />
                <Field
                  label={`Benefit ${i + 1} mechanism and allocation`}
                  multiline
                  value={b.mechanism}
                  onChange={(mechanism) => benefit(b.id, { mechanism })}
                />
              </div>
              <label className="aw-check">
                <input
                  type="checkbox"
                  checked={b.enabled}
                  onChange={(e) => benefit(b.id, { enabled: e.target.checked })}
                />
                Enable benefit {i + 1}
              </label>
              <label className="aw-check">
                <input
                  type="checkbox"
                  checked={b.overlapResolved}
                  onChange={(e) =>
                    benefit(b.id, { overlapResolved: e.target.checked })
                  }
                />
                I have allocated non-overlapping amounts and explained the
                allocation
              </label>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...value,
                    benefits: value.benefits.filter((x) => x.id !== b.id),
                  })
                }
              >
                Remove benefit {i + 1}
              </button>
            </fieldset>
          ))}
          <button
            type="button"
            onClick={() =>
              onChange({
                ...value,
                benefits: [
                  ...value.benefits,
                  {
                    id: newId(),
                    name: "",
                    kind: "quality",
                    annualAmount: null,
                    pool: "quality",
                    cashShare: 0,
                    enabled: false,
                    overlapResolved: false,
                    mechanism: "",
                  },
                ],
              })
            }
          >
            Add benefit line
          </button>
        </div>
      </details>
    </div>
  );
}
