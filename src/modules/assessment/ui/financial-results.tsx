import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { calculateOption, type FinancialResult } from "../economics";
import type { Opportunity, Currency } from "../types";
import type { SurfaceProps } from "./surface";
export const formatMetric = (
  value: number | null,
  style: "money" | "number" | "percent" = "number",
  currency: Currency = "USD",
) =>
  value === null
    ? "Not assessed"
    : new Intl.NumberFormat("en-US", {
        maximumFractionDigits: style === "percent" ? 1 : 2,
        ...(style === "money"
          ? { style: "currency", currency }
          : style === "percent"
            ? { style: "percent" }
            : {}),
      }).format(value);
export function FinancialResults({
  result,
  currency,
  title,
}: {
  result: FinancialResult;
  currency: Currency;
  title: string;
}) {
  return (
    <section className="aw-panel aw-stack">
      <h2>{title}</h2>
      {result.issues.length > 0 && (
        <div className="aw-callout">
          <strong>Calculation needs attention</strong>
          <ul>
            {result.issues.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <a href="#base-assumptions">
            Review base inputs and cost / benefit allocation
          </a>
        </div>
      )}
      <dl className="aw-financial-metrics">
        {(
          [
            ["Economic NPV (36 months)", result.npv, "money"],
            ["Cash NPV (subset)", result.cashNpv, "money"],
            ["Annual hours released", result.annualHoursSaved, "number"],
            ["FTE capacity", result.fteCapacity, "number"],
            ["Annual capacity value", result.capacityValue, "money"],
            ["Annual economic benefit", result.annualBenefit, "money"],
            ["Annual cash benefit (subset)", result.cashSavings, "money"],
            ["Month-zero incremental investment", result.investment, "money"],
            ["Annual incremental OPEX (year 1)", result.annualOpex, "money"],
            ["First-year economic net", result.firstYearNet, "money"],
            ["First-year cash net", result.firstYearCashNet, "money"],
            ["Economic ROI (year 1)", result.economicRoi, "percent"],
            ["Cash ROI (year 1)", result.cashRoi, "percent"],
            ["Economic payback (months)", result.paybackMonths, "number"],
            ["Cash payback (months)", result.cashPaybackMonths, "number"],
            ["Three-year economic net", result.threeYearNet, "money"],
            ["Zero-NPV adoption", result.breakEvenAdoption, "percent"],
          ] as const
        ).map(([label, value, style]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd
              className={value !== null && value < 0 ? "aw-state-concern" : ""}
            >
              {result.status === "complete" &&
              value === null &&
              label.includes("payback")
                ? "Not reached within 36 months"
                : result.status === "complete" &&
                    value === null &&
                    label.includes("ROI")
                  ? "Not defined (no positive initial investment)"
                  : result.status === "complete" &&
                      value === null &&
                      label === "Zero-NPV adoption"
                    ? "Not attainable at 0–100% adoption"
                    : formatMetric(value, style, currency)}
            </dd>
          </div>
        ))}
      </dl>
      <p>
        {result.maximumViableInvestment !== null &&
        result.maximumViableInvestment < 0
          ? "No nonnegative month-zero investment is viable at these assumptions (future discounted flows are adverse)."
          : `Maximum viable month-zero investment: ${formatMetric(result.maximumViableInvestment, "money", currency)}`}
      </p>
      <p className="aw-muted">
        Annual hours and benefits are steady-state run rates at the entered
        adoption. First-year totals include ramp. ROI divides first-year net by
        month-zero incremental investment, not legal CAPEX. Zero-NPV adoption
        may not clear the configured economic hurdle. Cash is included within
        economic value. Completed cases without payback are labelled not reached
        within 36 months; incomplete cases remain not assessed.
      </p>
      {result.monthly.length > 0 && (
        <figure aria-label="Monthly cumulative economic and cash net value">
          <div className="aw-chart">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={result.monthly}
                margin={{ top: 10, right: 12, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis
                  width={70}
                  tickFormatter={(v) =>
                    new Intl.NumberFormat("en", { notation: "compact" }).format(
                      v,
                    )
                  }
                />
                <Tooltip />
                <Legend />
                <Line
                  isAnimationActive={false}
                  dot={false}
                  type="linear"
                  dataKey="cumulative"
                  name="Economic net"
                  stroke="#176b58"
                  strokeWidth={2}
                />
                <Line
                  isAnimationActive={false}
                  dot={false}
                  type="linear"
                  dataKey="cashCumulative"
                  name="Cash net (subset)"
                  stroke="#3157d5"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <figcaption className="aw-muted">
            Cumulative net value, months 0–36 ({currency}).
          </figcaption>
          <details>
            <summary>Monthly chart data</summary>
            <div
              className="aw-scroll"
              tabIndex={0}
              role="region"
              aria-label="Monthly financial data"
            >
              <table>
                <caption>Cumulative net value</caption>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Economic net</th>
                    <th>Cash net</th>
                  </tr>
                </thead>
                <tbody>
                  {result.monthly.map((row) => (
                    <tr key={row.month}>
                      <th>{row.month}</th>
                      <td>{formatMetric(row.cumulative, "money", currency)}</td>
                      <td>
                        {formatMetric(row.cashCumulative, "money", currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </figure>
      )}
    </section>
  );
}
export function Comparison({
  opportunity,
  currency,
  inspect,
}: {
  opportunity: Opportunity;
  currency: Currency;
  inspect: SurfaceProps["inspect"];
}) {
  const bau = opportunity.options.find((x) => x.kind === "bau")!;
  return (
    <section className="aw-panel aw-stack">
      <div className="aw-section-heading">
        <h2>Compare saved base cases</h2>
        <button
          onClick={() =>
            inspect({
              title: "Calculation conventions",
              content: (
                <>
                  <p>
                    Hours = annual volume × max(0, baseline minutes × reduction
                    − review minutes) ÷ 60 × adoption.
                  </p>
                  <p>
                    Labour value = hours × hourly cost × realisation. Cash =
                    labour value × cash share, plus cash portions of enabled
                    additional benefits.
                  </p>
                  <p>
                    Each month applies adoption ramp to annual benefits / 12,
                    subtracts scheduled costs and the equivalent BAU flows. NPV
                    discounts incremental monthly economic flows over 36 months
                    using the annual discount rate.
                  </p>
                  <p>
                    Quality and contribution-margin amounts are annual potential
                    before adoption/ramp. Shared pools need explicit
                    non-overlapping allocation. Human review minutes and review
                    costs require an allocation explanation.
                  </p>
                </>
              ),
            })
          }
        >
          Inspect formulas
        </button>
      </div>
      <div
        className="aw-scroll"
        tabIndex={0}
        role="region"
        aria-label="Option comparison table"
      >
        <table className="aw-comparison-table">
          <caption>Incremental to the same BAU baseline · {currency}</caption>
          <thead>
            <tr>
              <th>Option</th>
              <th>Economic NPV</th>
              <th>Cash NPV</th>
              <th>Initial investment</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {opportunity.options.map((x) => {
              const r = calculateOption(x, bau);
              return (
                <tr key={x.id}>
                  <th>{x.name}</th>
                  <td>{formatMetric(r.npv, "money", currency)}</td>
                  <td>{formatMetric(r.cashNpv, "money", currency)}</td>
                  <td>{formatMetric(r.investment, "money", currency)}</td>
                  <td>{r.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
