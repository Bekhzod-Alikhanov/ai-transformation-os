import { useState } from "react";
import Decimal from "decimal.js";
import { compareInvestment } from "../decision";
import { useDraft, useDrafts } from "./drafts";
import { formatMetric, Comparison } from "./financial-results";
import { Field, ErrorMessage, errorText } from "./fields";
import { saveOption } from "./investment-operations";
import type { SurfaceProps } from "./surface";
import type { SolutionOption } from "../types";

export function Cockpit(props: SurfaceProps) {
  if (!props.opportunity)
    return (
      <section className="aw-panel">
        <h1>Decision Overview</h1>
        <p>Add an opportunity to begin a decision case.</p>
        <button onClick={() => props.navigate({ section: "brief" })}>
          Edit engagement brief
        </button>
      </section>
    );
  return <CockpitContent key={props.opportunity.id} {...props} />;
}
function CockpitContent(props: SurfaceProps) {
  const saved = props.opportunity!,
    drafts = useDrafts(),
    o = drafts.project(saved),
    decision = compareInvestment(props.engagement, o),
    selected = saved.options.find((x) => x.id === saved.selectedOptionId)!,
    draft = useDraft(`${selected.id}:base`, selected),
    original = useDraft(`${selected.id}:base-source`, selected),
    [error, setError] = useState("");
  const viewed = decision.alternatives.find(
      (x) => x.option.id === selected.id,
    )!,
    f = viewed.financial,
    currency = props.engagement.currency;
  function edit(next: SolutionOption) {
    if (!draft.dirty) original.set(selected);
    draft.set(next);
  }
  const initialLines = draft.value.costs.filter(
    (c) => c.frequency === "one_time" && c.startMonth === 0,
  );
  const initialTotal = initialLines.some((c) => c.amount === null)
    ? null
    : initialLines
        .reduce((sum, c) => sum.plus(c.amount!), new Decimal(0))
        .toNumber();
  function challengeInvestment(s: string) {
    const amount = s === "" ? null : Number(s);
    let assigned = new Decimal(0);
    edit({
      ...draft.value,
      costs: draft.value.costs.map((c) => {
        const index = initialLines.findIndex((x) => x.id === c.id);
        if (index < 0) return c;
        const share =
          initialTotal && c.amount !== null
            ? new Decimal(c.amount).div(initialTotal)
            : new Decimal(1).div(initialLines.length);
        const next =
          amount === null
            ? null
            : index === initialLines.length - 1
              ? new Decimal(amount).minus(assigned).toNumber()
              : Decimal.min(
                  new Decimal(amount).minus(assigned),
                  new Decimal(amount).times(share),
                ).toNumber();
        if (next !== null) assigned = assigned.plus(next);
        return { ...c, amount: next };
      }),
    });
  }
  function metric(
    label: string,
    value: number | null | undefined,
    kind: "money" | "number" | "percent",
    explanation: string,
    key?: string,
  ) {
    return (
      <button
        className="aw-kpi"
        key={label}
        onClick={() =>
          props.inspect({
            title: label,
            content: (
              <>
                <p>{explanation}</p>
                <p>
                  Basis: {draft.dirty ? "working draft" : "saved revision"} ·{" "}
                  {selected.name} · {currency} · 36 months.
                </p>
                <button
                  onClick={() =>
                    props.navigate({
                      section: "options",
                      recordId: selected.id,
                    })
                  }
                >
                  Review inputs and evidence
                </button>
              </>
            ),
          })
        }
      >
        <span>{label}</span>
        <strong
          className={
            typeof value === "number" && value < 0 ? "aw-negative" : undefined
          }
          data-testid={key}
        >
          {value == null && label.includes("payback") && f.status === "complete"
            ? "Not reached"
            : value == null && label.includes("ROI") && f.status === "complete"
              ? "Undefined"
              : formatMetric(value ?? null, kind, currency)}
        </strong>
        <small>Inspect calculation ↗</small>
      </button>
    );
  }
  return (
    <div className="aw-stack">
      <div className="aw-section-heading">
        <div>
          <p className="aw-eyebrow">01 / Investment decision</p>
          <h1>{props.engagement.name}</h1>
          <p>
            {props.engagement.client} · {props.engagement.problem}
          </p>
        </div>
        <span className="aw-tag">
          {drafts.dirty
            ? "Working draft · not saved"
            : `Saved revision ${saved.revision}`}
        </span>
      </div>
      <section className="aw-verdict">
        <div>
          <p className="aw-eyebrow">Calculated advisory recommendation</p>
          <h2>{decision.outcome}</h2>
          <p className="aw-verdict-option">
            Preferred: <strong>{decision.preferredName}</strong>
          </p>
          <p>{decision.reasons.join(" ")}</p>
        </div>
        <div className="aw-verdict-actions">
          <button
            className="aw-primary"
            onClick={() => props.navigate({ section: "options" })}
          >
            Compare investment options →
          </button>
          <button onClick={() => props.navigate({ section: "recommendation" })}>
            Review validation & record decision
          </button>
          <small>Advisory, not spending approval.</small>
        </div>
      </section>
      <p className="aw-muted">
        Metrics below: {selected.name}. Preferred option and selected
        recommendation basis are separate; choose a new basis in Investment
        Comparison.
      </p>
      <div className="aw-cockpit-metrics">
        {metric(
          "Economic NPV",
          f.npv,
          "money",
          "Sum of economic monthly incremental net / (1 + annual discount rate)^(month / 12), months 0–36. Capacity value is included; cash is not added again.",
          "cockpit-npv",
        )}
        {metric(
          "Cash-only NPV",
          f.cashNpv,
          "money",
          `Only the cash portion of benefits enters these flows. Mechanism: ${viewed.option.cashMechanism || "No cash savings claimed"}.`,
        )}
        {metric(
          "First-year ROI",
          f.economicRoi,
          "percent",
          "Economic net in months 0–12 divided by positive month-zero incremental investment. Later investments remain in net flows. Undefined if denominator is zero.",
        )}
        {metric(
          "Sustained payback · months",
          f.paybackMonths,
          "number",
          "First month with a nonnegative cumulative economic balance that stays nonnegative through month 36.",
        )}
        {metric(
          "Annual hours released",
          f.annualHoursSaved,
          "number",
          "Current human hours minus future human hours including unused/ineligible work, handling, review and exceptions. Negative means added work.",
        )}
        {metric(
          "FTE-equivalent capacity",
          f.fteCapacity,
          "number",
          "Annual hours released / productive hours per FTE. This is capacity, not a headcount-reduction commitment.",
        )}
        {metric(
          "Initial investment",
          f.investment,
          "money",
          "Month-zero costs incremental to BAU. Subsequent investment remains in the 36-month schedule; classifications are user-provided, not legal CAPEX advice.",
        )}
        {metric(
          "Year-one incremental OPEX",
          f.annualOpex,
          "money",
          "Recurring costs in months 1–12 less BAU recurring costs, including model usage, infrastructure, monitoring and support.",
        )}
        {metric(
          "First-year economic net",
          f.firstYearNet,
          "money",
          "All economic benefits less incremental costs in months 0–12, after adoption ramp.",
        )}
      </div>
      <div className="aw-cockpit-columns">
        <section className="aw-panel aw-stack">
          <h2>Challenge the case</h2>
          <p>
            Change one assumption. Draft returns and ranking recalculate
            immediately.
          </p>
          <fieldset
            disabled={props.busy || props.engagement.archived}
            className="aw-stack"
          >
            <Field
              label="Challenge adoption (%)"
              type="number"
              value={
                draft.value.inputs.adoption == null
                  ? null
                  : draft.value.inputs.adoption * 100
              }
              onChange={(s) =>
                edit({
                  ...draft.value,
                  inputs: {
                    ...draft.value.inputs,
                    adoption: s === "" ? null : Number(s) / 100,
                  },
                })
              }
            />
            <Field
              label="Challenge initial investment"
              type="number"
              value={initialTotal}
              onChange={challengeInvestment}
            />
            {draft.value.taskPlan && (
              <Field
                label="Challenge preparation review (minutes/item)"
                type="number"
                value={draft.value.taskPlan.rows[1]?.reviewMinutes ?? null}
                onChange={(s) =>
                  edit({
                    ...draft.value,
                    taskPlan: {
                      ...draft.value.taskPlan!,
                      rows: draft.value.taskPlan!.rows.map((r, i) =>
                        i === 1
                          ? { ...r, reviewMinutes: s === "" ? null : Number(s) }
                          : r,
                      ),
                    },
                  })
                }
              />
            )}
            <div className="aw-actions">
              <button
                className="aw-primary"
                disabled={!draft.dirty}
                onClick={async () => {
                  try {
                    await props.save(
                      "Saved cockpit challenge assumptions",
                      (e) => {
                        const target = e.opportunities.find(
                          (x) => x.id === saved.id,
                        )!;
                        Object.assign(
                          target,
                          saveOption(
                            target,
                            draft.value,
                            {
                              owner: props.engagement.lead || "Beck",
                              confidence: "low",
                              evidenceIds: [],
                            },
                            original.value,
                          ),
                        );
                      },
                    );
                    draft.reset();
                    original.reset();
                    setError("");
                  } catch (cause) {
                    setError(errorText(cause));
                  }
                }}
              >
                Save challenged assumptions
              </button>
              <button
                disabled={!draft.dirty}
                onClick={() => {
                  draft.reset();
                  original.reset();
                }}
              >
                Discard challenge
              </button>
            </div>
          </fieldset>
          <ErrorMessage error={error} />
        </section>
        <section className="aw-panel aw-stack">
          <h2>What could change the decision?</h2>
          <ol>
            {decision.reversalConditions.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ol>
          <h3>Next evidence to collect</h3>
          {saved.requests
            .filter((x) => x.status === "open")
            .slice(0, 3)
            .map((x) => (
              <button
                key={x.id}
                className="aw-request"
                onClick={() =>
                  props.navigate({ section: "evidence", recordId: x.id })
                }
              >
                <strong>{x.question}</strong>
                <small>
                  {x.owner || "Owner needed"} · {x.impact}
                </small>
              </button>
            ))}
          <p>
            Evidence readiness:{" "}
            <strong>{viewed.assessment.dimensions.evidence}</strong>. Accepted
            synthetic sources are not real client proof.
          </p>
          <button onClick={() => props.navigate({ section: "evidence" })}>
            Inspect sources & discovery →
          </button>
        </section>
      </div>
      <Comparison opportunity={o} currency={currency} inspect={props.inspect} />
      <section className="aw-panel">
        <h2>Why not the alternatives?</h2>
        {decision.alternatives
          .filter((r) => r.option.kind !== "bau")
          .map((r) => (
            <div className="aw-alternative" key={r.option.id}>
              <strong>{r.option.name}</strong>
              <p>
                {r.blockers.join("; ") ||
                  (r.option.id === decision.preferredId
                    ? "Highest viable value under the selected objective; readiness gates still apply."
                    : "Lower value than the preferred option under these assumptions.")}
              </p>
              <button
                onClick={() =>
                  props.navigate({ section: "options", recordId: r.option.id })
                }
              >
                Review this option
              </button>
            </div>
          ))}
      </section>
    </div>
  );
}
