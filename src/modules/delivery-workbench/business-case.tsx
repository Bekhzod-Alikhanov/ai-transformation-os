"use client";
import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  calculateEconomics,
  inputSchema,
  sensitivity,
  type EconomicInput,
  type SimulationResult,
} from "./economics";
import { compact, currency, number, percent } from "./exports";
import { optionInputs, optionLabels, type Project } from "./model";

export const fields: {
  key: keyof EconomicInput;
  label: string;
  unit: string;
  step: number;
  help: string;
}[] = [
  {
    key: "annualVolume",
    label: "Eligible annual volume",
    unit: "tasks / year",
    step: 1,
    help: "Only work eligible for the proposed workflow.",
  },
  {
    key: "minutesBefore",
    label: "Baseline effort",
    unit: "min / task",
    step: 0.1,
    help: "Observed end-to-end human preparation time.",
  },
  {
    key: "reduction",
    label: "Preparation reduction",
    unit: "fraction 0–1",
    step: 0.01,
    help: "Before additional human review; must be validated in a pilot.",
  },
  {
    key: "reviewMinutes",
    label: "Additional review",
    unit: "min / task",
    step: 0.1,
    help: "Human review and exception effort introduced by the solution.",
  },
  {
    key: "adoption",
    label: "Steady-state adoption",
    unit: "fraction 0–1",
    step: 0.01,
    help: "Share of eligible work using the solution after ramp-up.",
  },
  {
    key: "hourlyCost",
    label: "Loaded hourly cost",
    unit: "USD / hour",
    step: 1,
    help: "Salary and employer overhead planning rate.",
  },
  {
    key: "realisation",
    label: "Capacity realization",
    unit: "fraction 0–1",
    step: 0.01,
    help: "Share of released time that can be productively redeployed.",
  },
  {
    key: "cashShare",
    label: "Cash-saving share",
    unit: "fraction 0–1",
    step: 0.01,
    help: "Subset of realized capacity backed by avoided overtime, contractors or hiring. Not added to economic benefit.",
  },
  {
    key: "productiveHours",
    label: "Productive hours / FTE",
    unit: "hours / year",
    step: 1,
    help: "A capacity equivalent, not an automatic staffing reduction.",
  },
  {
    key: "implementationCost",
    label: "Initial investment",
    unit: "USD",
    step: 100,
    help: "Engineering, data preparation, integration, training and change.",
  },
  {
    key: "annualRunCost",
    label: "Annual operating cost",
    unit: "USD / year",
    step: 100,
    help: "Software, hosting, model use, monitoring and support. Review effort is already deducted from saved time.",
  },
  {
    key: "rampMonths",
    label: "Adoption ramp",
    unit: "months 0–12",
    step: 1,
    help: "Linear ramp; operating costs begin in month one.",
  },
  {
    key: "discountRate",
    label: "Discount rate",
    unit: "fraction 0–1",
    step: 0.01,
    help: "Annual rate, converted consistently to monthly discounting.",
  },
];

export function BusinessCase({
  project,
  change,
}: {
  project: Project;
  change: (detail: string, update: (p: Project) => void) => void;
}) {
  const [draft, setDraft] = useState<Record<keyof EconomicInput, string>>(
    () =>
      Object.fromEntries(
        Object.entries(project.inputs).map(([key, value]) => [
          key,
          String(value),
        ]),
      ) as Record<keyof EconomicInput, string>,
  );
  const [message, setMessage] = useState("");
  const [simulation, setSimulation] = useState<{
    revision: number;
    result: SimulationResult;
  } | null>(null);
  const [running, setRunning] = useState(false);
  const worker = useRef<Worker | null>(null);
  useEffect(() => () => worker.current?.terminate(), []);
  const result = calculateEconomics(project.inputs);
  const scenarios = [
    {
      label: "Conservative",
      input: {
        ...project.inputs,
        adoption: Math.max(0, project.inputs.adoption - 0.2),
        implementationCost: project.inputs.implementationCost * 1.2,
      },
    },
    { label: "Current plan", input: project.inputs },
    {
      label: "Upside",
      input: {
        ...project.inputs,
        adoption: Math.min(1, project.inputs.adoption + 0.1),
        reduction: Math.min(1, project.inputs.reduction + 0.05),
      },
    },
  ];
  const adoptionBreakEven = (() => {
    let low = 0;
    let high = 1;
    if (calculateEconomics({ ...project.inputs, adoption: 1 }).npv < 0)
      return null;
    for (let i = 0; i < 30; i++) {
      const mid = (low + high) / 2;
      if (calculateEconomics({ ...project.inputs, adoption: mid }).npv >= 0)
        high = mid;
      else low = mid;
    }
    return high;
  })();
  function runSimulation() {
    try {
      worker.current?.terminate();
      setRunning(true);
      setMessage("");
      const current = new Worker(
        new URL("./simulation.worker.ts", import.meta.url),
      );
      worker.current = current;
      const revision = project.revision;
      current.onmessage = (
        event: MessageEvent<{ result?: SimulationResult; error?: string }>,
      ) => {
        setRunning(false);
        current.terminate();
        if (event.data.result)
          setSimulation({ revision, result: event.data.result });
        else setMessage(event.data.error ?? "Simulation failed; try again.");
      };
      current.onerror = () => {
        setRunning(false);
        setMessage(
          "Simulation could not start. Deterministic scenarios remain available.",
        );
        current.terminate();
      };
      current.postMessage({ input: project.inputs, seed: 20260912 });
    } catch {
      setRunning(false);
      setMessage("This browser could not start the simulation worker.");
    }
  }
  return (
    <div className="dw-stack">
      <div className="dw-section-heading">
        <div>
          <span className="dw-eyebrow">INVESTMENT DISCIPLINE</span>
          <h2>What must be true for this to pay off?</h2>
          <p>
            USD · economic value includes redeployable capacity. Cash value is
            shown separately.
          </p>
        </div>
      </div>
      <div className="dw-option-grid" data-tour="options">
        {(["rules", "copilot", "rollout"] as const).map((option) => {
          const inputs =
            project.option === option
              ? project.inputs
              : optionInputs(project.id, option);
          const value = calculateEconomics(inputs);
          return (
            <button
              key={option}
              disabled={project.option === option}
              aria-pressed={project.option === option}
              className={
                "dw-option " + (project.option === option ? "selected" : "")
              }
              onClick={() => {
                change(
                  "Selected " + optionLabels[option] + " costed template",
                  (p) => {
                    p.option = option;
                    p.inputs = inputs;
                  },
                );
              }}
            >
              <span>{optionLabels[option]}</span>
              <strong>{compact(value.npv)}</strong>
              <small>
                3-year economic NPV · {compact(inputs.implementationCost)}{" "}
                investment
              </small>
              <b>
                {option === "rollout"
                  ? "Challenge the expensive proposal"
                  : option === "copilot"
                    ? "Human-reviewed workflow"
                    : "Lower complexity, narrower value"}
              </b>
            </button>
          );
        })}
      </div>
      <div className="dw-kpis six" data-tour="economics">
        <Metric
          label="Annual hours released"
          value={number(result.annualHoursSaved)}
          note={result.fteCapacity.toFixed(2) + " FTE capacity · steady state"}
        />
        <Metric
          label="Initial investment"
          value={compact(project.inputs.implementationCost)}
          note="Engineering, integration & change"
        />
        <Metric
          label="Annual OPEX"
          value={compact(project.inputs.annualRunCost)}
          note="Recurring technology & operations"
        />
        <Metric
          label="Year-one net result"
          value={compact(result.yearOneNet)}
          note="Economic benefit less all costs"
          negative={result.yearOneNet < 0}
        />
        <Metric
          label="Year-one economic ROI"
          value={
            result.firstYearRoi === null ? "N/A" : percent(result.firstYearRoi)
          }
          note="Includes adoption ramp"
          negative={(result.firstYearRoi ?? 0) < 0}
        />
        <Metric
          label="Economic payback"
          value={
            result.paybackMonths === null
              ? ">36 mo"
              : result.paybackMonths.toFixed(1) + " mo"
          }
          note="Monthly cumulative cash-flow model"
        />
      </div>
      <div className="dw-two-column">
        <section className="dw-panel">
          <div className="dw-panel-title">
            <h3>The value bridge</h3>
            <span>Annual steady state</span>
          </div>
          <dl className="dw-value-list">
            <div>
              <dt>Released capacity at loaded cost</dt>
              <dd>{currency(result.capacityValue)}</dd>
            </div>
            <div>
              <dt>
                Realizable economic benefit{" "}
                <small>
                  {percent(project.inputs.realisation)} of capacity value
                </small>
              </dt>
              <dd>{currency(result.annualBenefit)}</dd>
            </div>
            <div>
              <dt>
                Cash-saving subset{" "}
                <small>
                  {percent(project.inputs.cashShare)} · requires an explicit
                  mechanism
                </small>
              </dt>
              <dd>{currency(result.cashSavings)}</dd>
            </div>
            <div>
              <dt>Annual operating expense</dt>
              <dd>−{currency(project.inputs.annualRunCost)}</dd>
            </div>
            <div className="total">
              <dt>Net annual economic benefit</dt>
              <dd>{currency(result.annualNet)}</dd>
            </div>
          </dl>
          <p className="dw-footnote">
            Cash savings are a subset of the benefit, not a second benefit to
            add. No headcount reduction is assumed.
          </p>
        </section>
        <section className="dw-panel">
          <div className="dw-panel-title">
            <h3>Cumulative economic value</h3>
            <span>36 months</span>
          </div>
          <div
            style={{ height: 220, width: "100%", minWidth: 0 }}
            role="img"
            aria-label={
              "Cumulative economic value ends at " +
              currency(result.threeYearNet)
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={[
                  { month: 0, cumulative: -project.inputs.implementationCost },
                  ...result.monthly,
                ]}
                margin={{ left: 5, right: 8, top: 10, bottom: 5 }}
              >
                <CartesianGrid vertical={false} stroke="#e5e8e3" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => compact(v)}
                  tick={{ fontSize: 11 }}
                  width={65}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v) => [currency(Number(v)), "Cumulative value"]}
                />
                <ReferenceLine y={0} stroke="#989e93" />
                <Area
                  dataKey="cumulative"
                  stroke="#197463"
                  fill="#dcefe8"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="dw-mini-grid">
            <div>
              <small>Economic NPV</small>
              <strong>{compact(result.npv)}</strong>
            </div>
            <div>
              <small>Cash-only NPV</small>
              <strong className={result.cashNpv < 0 ? "dw-negative" : ""}>
                {compact(result.cashNpv)}
              </strong>
            </div>
            <div>
              <small>Break-even adoption</small>
              <strong>
                {adoptionBreakEven === null
                  ? "Not reachable"
                  : percent(adoptionBreakEven)}
              </strong>
            </div>
          </div>
        </section>
      </div>
      <section className="dw-panel" data-tour="assumptions">
        <div className="dw-panel-title">
          <div>
            <h3>Assumption register</h3>
            <p>
              Save a complete revision. Every field below is an explicit
              planning assumption unless supported by reviewed evidence.
            </p>
          </div>
          <span className="dw-chip">Revision {project.revision}</span>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            try {
              const parsed = inputSchema.parse(
                Object.fromEntries(
                  Object.entries(draft).map(([key, value]) => {
                    if (!value.trim())
                      throw new Error(
                        "Complete every assumption before saving.",
                      );
                    return [key, Number(value)];
                  }),
                ),
              );
              if (JSON.stringify(parsed) === JSON.stringify(project.inputs)) {
                setMessage("No assumptions changed.");
                return;
              }
              change("Saved a complete financial assumption revision", (p) => {
                p.inputs = parsed;
              });
              setMessage(
                "Assumptions saved. Prior recommendations now require reassessment.",
              );
            } catch (error) {
              setMessage(
                error instanceof Error && !error.message.startsWith("[")
                  ? error.message
                  : "Use finite nonnegative amounts, fractions between 0 and 1, and a whole-month ramp of 0–12.",
              );
            }
          }}
        >
          <div className="dw-input-grid">
            {fields.map((field) => (
              <label key={field.key}>
                {field.label}
                <span className="dw-field-unit">{field.unit}</span>
                <input
                  aria-label={field.label}
                  type="number"
                  min="0"
                  step={field.step}
                  required
                  value={draft[field.key]}
                  onChange={(e) =>
                    setDraft({ ...draft, [field.key]: e.target.value })
                  }
                />
                <small>{field.help}</small>
              </label>
            ))}
          </div>
          <div className="dw-form-actions">
            <button className="dw-btn primary" type="submit">
              Save assumptions
            </button>
            <span>
              Saving does not authorize spending or change a historical
              decision.
            </span>
          </div>
        </form>
      </section>
      <section className="dw-panel">
        <div className="dw-panel-title">
          <h3>How robust is the case?</h3>
          <span>Economic NPV · three years</span>
        </div>
        <div className="dw-option-grid">
          {scenarios.map((s) => (
            <div className="dw-scenario" key={s.label}>
              <span>{s.label}</span>
              <strong>{compact(calculateEconomics(s.input).npv)}</strong>
              <small>
                {percent(s.input.adoption)} adoption ·{" "}
                {compact(s.input.implementationCost)} investment
              </small>
            </div>
          ))}
        </div>
        <details className="dw-details">
          <summary>Inspect sensitivity and formulas</summary>
          <div className="dw-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Assumption varied</th>
                  <th>Lower input</th>
                  <th>Current NPV</th>
                  <th>Higher input</th>
                </tr>
              </thead>
              <tbody>
                {sensitivity(project.inputs).map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td>{currency(row.low)}</td>
                    <td>{currency(row.base)}</td>
                    <td>{currency(row.high)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="dw-footnote">
            Hours = annual volume × max(0, baseline minutes × reduction −
            additional review minutes) ÷ 60 × adoption. Economic benefit = hours
            × loaded cost × realization. First-year ROI = (ramped benefit −
            annual OPEX − investment) ÷ investment. NPV = −investment +
            discounted monthly net benefit over 36 months. Sensitivity varies
            adoption −20/+10 points; investment and OPEX ±20%; review ±50%;
            reduction ±10 points.
          </p>
        </details>
        <button className="dw-btn" onClick={runSimulation} disabled={running}>
          {running
            ? "Calculating 10,000 scenarios…"
            : "Run uncertainty analysis"}
        </button>
        {simulation ? (
          <div className="dw-simulation">
            <p>
              <strong>10,000 simulated outcomes</strong> · seed{" "}
              {simulation.result.seed} · revision {simulation.revision}
              {simulation.revision !== project.revision
                ? " · STALE — rerun for current assumptions"
                : ""}
            </p>
            <div className="dw-mini-grid">
              <div>
                <small>P10 NPV</small>
                <strong>{compact(simulation.result.p10)}</strong>
              </div>
              <div>
                <small>Median NPV</small>
                <strong>{compact(simulation.result.p50)}</strong>
              </div>
              <div>
                <small>P90 NPV</small>
                <strong>{compact(simulation.result.p90)}</strong>
              </div>
              <div>
                <small>Payback within 36 months</small>
                <strong>{percent(simulation.result.paybackProbability)}</strong>
              </div>
            </div>
            <div
              className="dw-histogram"
              aria-label="Distribution of simulated three-year NPV"
            >
              {simulation.result.histogram.map((bucket, index) => (
                <div
                  key={index}
                  title={
                    currency(bucket.from) +
                    " to " +
                    currency(bucket.to) +
                    ": " +
                    bucket.count +
                    " outcomes"
                  }
                  style={{
                    height:
                      (100 * bucket.count) /
                        Math.max(
                          ...simulation.result.histogram.map((b) => b.count),
                        ) +
                      "%",
                  }}
                />
              ))}
            </div>
            <p className="dw-footnote">
              Illustrative triangular uncertainty: adoption −20/+10 points,
              reduction −15/+8 points, investment −10/+30%, OPEX −10/+25%.
              Assumes independent inputs. P10–P90 is an uncertainty range, not
              evidence of live performance.
            </p>
          </div>
        ) : null}
      </section>
      {message ? (
        <p role="status" className="dw-notice">
          {message}
        </p>
      ) : null}
    </div>
  );
}
export function Metric({
  label,
  value,
  note,
  negative = false,
}: {
  label: string;
  value: string;
  note: string;
  negative?: boolean;
}) {
  return (
    <div className="dw-metric">
      <span>{label}</span>
      <strong className={negative ? "dw-negative" : ""}>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
