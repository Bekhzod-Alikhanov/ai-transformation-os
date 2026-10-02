import { useState } from "react";
import {
  assessPilot,
  createPilotDraft,
  savePilotRevision,
  applyPilotFindings,
  pilotBasis,
  rebasePilotDraft,
} from "../pilot";
import { pilotDraftSchema, type PilotDraft } from "../types";
import type { SurfaceProps } from "./surface";
import { useDraft } from "./drafts";
import { Field, Select, ErrorMessage, errorText } from "./fields";
import { formatMetric } from "./financial-results";

const num = (value: string) => (value.trim() === "" ? null : Number(value));
export function PilotSurface(props: SurfaceProps) {
  const o = props.opportunity!,
    option = o.options.find((x) => x.id === o.selectedOptionId)!;
  if (!option.taskPlan || option.kind === "bau")
    return (
      <section className="aw-panel aw-stack">
        <h2>Pilot results</h2>
        <p>
          Choose an intervention with a task model to review pilot timings.
          Existing aggregate assessments remain unchanged.
        </p>
        <button onClick={() => props.navigate({ section: "options" })}>
          Open investment comparison
        </button>
      </section>
    );
  return <PilotEditor key={`${o.id}:${option.id}`} {...props} />;
}
function PilotEditor(props: SurfaceProps) {
  const o = props.opportunity!,
    option = o.options.find((x) => x.id === o.selectedOptionId)!;
  const pilots = (o.pilots ?? []).filter((p) => p.optionId === option.id),
    latest = pilots.at(-1);
  const draft = useDraft<PilotDraft>(
    `${o.id}:${option.id}:pilot`,
    latest ?? createPilotDraft(props.engagement, o),
  );
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [reviewing, setReviewing] = useState<{ id: string; basis: string } | null>(
      null,
    );
  const review = useDraft(`${o.id}:${option.id}:pilot-review`, {
    owner: "",
    rationale: "",
    confidence: "low" as "low" | "medium" | "high",
  });
  const value = draft.value,
    result = assessPilot(props.engagement, o, value);
  const edit = <K extends keyof PilotDraft>(key: K, input: PilotDraft[K]) => {
    const {
      id: _id,
      at: _at,
      ...editable
    } = value as PilotDraft & { id?: string; at?: string };
    void _id;
    void _at;
    draft.set({ ...editable, [key]: input });
    setReviewing(null);
    setNotice("");
  };
  function replace(next: PilotDraft) {
    if (
      draft.dirty &&
      !window.confirm(
        "Replace this unsaved pilot draft? Saved pilot revisions are preserved.",
      )
    )
      return;
    draft.set(next);
    setReviewing(null);
    setError("");
    setNotice("");
  }
  const shown = (n: number | null, money = false) =>
    n === null
      ? "Not calculable"
      : money
        ? new Intl.NumberFormat("en-GB", {
            style: "currency",
            currency: value.forecast.currency,
          }).format(n)
        : new Intl.NumberFormat("en-GB", { maximumFractionDigits: 3 }).format(
            n,
          );
  const applied =
    latest && o.pilotApplications?.find((p) => p.pilotId === latest.id);
  const metricRows = [
    [
      "Annual hours released",
      result.forecast.annualHoursSaved,
      result.projected.annualHoursSaved,
      false,
    ],
    [
      "Initial investment",
      result.forecast.investment,
      result.projected.investment,
      true,
    ],
    [
      "First-year recurring OPEX",
      result.forecast.annualOpex,
      result.projected.annualOpex,
      true,
    ],
    ["Economic NPV", result.forecast.npv, result.projected.npv, true],
    ["Cash-only NPV", result.forecast.cashNpv, result.projected.cashNpv, true],
    [
      "First-year economic net",
      result.forecast.firstYearNet,
      result.projected.firstYearNet,
      true,
    ],
    [
      "First-year cash net",
      result.forecast.firstYearCashNet,
      result.projected.firstYearCashNet,
      true,
    ],
  ] as const;
  return (
    <section
      className="aw-panel aw-stack aw-pilot"
      aria-labelledby="pilot-heading"
    >
      <div className="aw-section-heading">
        <div>
          <p className="aw-eyebrow">Forecast → pilot → decision</p>
          <h2 id="pilot-heading">Pilot results</h2>
        </div>
        <span className="aw-tag">
          {draft.dirty
            ? "Unsaved pilot draft"
            : latest
              ? "Saved synthetic pilot"
              : "No pilot results recorded"}
        </span>
      </div>
      <p>
        Local synthetic observations only. Compare matched human effort, review
        assumptions explicitly, and preserve the original investment hypothesis.
      </p>
      <div
        className={`aw-pilot-verdict ${result.disposition === "Stop" || result.disposition === "Fix" ? "aw-pilot-adverse" : ""}`}
      >
        <span>ADVISORY PILOT DISPOSITION</span>
        <strong>{result.disposition}</strong>
        <p>
          Separate from Beck’s recommendation. No spending or release
          authorisation.
        </p>
      </div>
      <div
        className="aw-grid aw-pilot-observed"
        aria-label="Recorded pilot metrics"
      >
        {[
          [
            "Sample adoption",
            result.metrics.adoption === null
              ? "Not calculable"
              : `${(result.metrics.adoption * 100).toFixed(1)}%`,
          ],
          [
            "Reviewed success rate",
            result.metrics.successRate === null
              ? "Not calculable"
              : `${(result.metrics.successRate * 100).toFixed(1)}%`,
          ],
          ["Matched hours released", shown(result.metrics.hoursReleased)],
          ["Recorded pilot cost", shown(result.metrics.totalCost, true)],
          [
            "Cost per successful outcome",
            shown(result.metrics.costPerSuccess, true),
          ],
        ].map(([label, text]) => (
          <div className="aw-kpi" key={label}>
            <span>{label}</span>
            <strong>{text}</strong>
          </div>
        ))}
      </div>
      <div className="aw-stack">
        <h3>Annualised projections · not realised savings</h3>
        <p className="aw-muted">
          Frozen pre-pilot forecast vs timing-informed projection. Annual
          workload, eligibility, costs, cash mechanism and representativeness
          remain assumptions.
        </p>
        <div
          className="aw-table-wrap"
          role="region"
          aria-label="Forecast versus pilot projection"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th scope="col">Metric</th>
                <th scope="col">Original forecast</th>
                <th scope="col">Pilot-informed projection</th>
                <th scope="col">Change</th>
              </tr>
            </thead>
            <tbody>
              {metricRows.map(([label, before, after, money]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  <td>{shown(before, money)}</td>
                  <td>{shown(after, money)}</td>
                  <td>
                    {before === null || after === null
                      ? "Not calculable"
                      : shown(after - before, money)}
                  </td>
                </tr>
              ))}
              {(
                [
                  ["First-year economic ROI", "economicRoi"],
                  ["First-year cash ROI", "cashRoi"],
                ] as const
              ).map(([label, key]) => (
                <tr key={key}>
                  <th scope="row">{label}</th>
                  {[result.forecast, result.projected].map((r, i) => (
                    <td key={i}>
                      {r[key] === null
                        ? r.status === "complete"
                          ? "Not defined (no positive initial investment)"
                          : "Not assessed"
                        : formatMetric(
                            r[key],
                            "percent",
                            value.forecast.currency,
                          )}
                    </td>
                  ))}
                  <td>Month-zero investment denominator</td>
                </tr>
              ))}
              {(
                [
                  ["Economic payback", "paybackMonths"],
                  ["Cash payback", "cashPaybackMonths"],
                ] as const
              ).map(([label, key]) => (
                <tr key={key}>
                  <th scope="row">{label}</th>
                  {[result.forecast, result.projected].map((r, i) => (
                    <td key={i}>
                      {r[key] === null
                        ? r.status === "complete"
                          ? "Not reached within 36 months"
                          : "Not assessed"
                        : `${r[key]} months`}
                    </td>
                  ))}
                  <td>Sustained within 36 months</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <details className="aw-pilot-reasons">
        <summary>Decision conditions · {result.reasons.length} items</summary>
        <ul>
          {result.reasons.map((r, i) => (
            <li key={`${r.message}:${i}`}>
              <button
                className="aw-text-button"
                onClick={() =>
                  r.target === "measurements" || r.target === "thresholds"
                    ? document
                        .getElementById(`pilot-${r.target}`)
                        ?.scrollIntoView({ block: "center" })
                    : props.navigate({ section: r.target })
                }
              >
                {r.message}
              </button>
            </li>
          ))}
        </ul>
      </details>
      {result.stale && (
        <p className="aw-error" role="alert">
          Historical basis changed. Start a new pilot on the current basis; the
          original projection is retained.
        </p>
      )}
      {result.baselineDiscrepancies.map((text) => (
        <p className="aw-callout" key={text}>
          {text}
        </p>
      ))}
      <div className="aw-actions">
        <button
          disabled={
            props.busy || value.forecast.basis === pilotBasis(o, option.id)
          }
          onClick={() => {
            try {
              draft.set(
                pilotDraftSchema.parse(
                  rebasePilotDraft(props.engagement, o, value),
                ),
              );
              setReviewing(null);
              setError("");
              setNotice(
                "Measurements retained on the current basis. Review costs and assumptions before saving a new revision.",
              );
            } catch (cause) {
              setError(errorText(cause));
            }
          }}
        >
          Retain measurements on current basis
        </button>
        <button
          disabled={props.busy}
          onClick={() => replace(createPilotDraft(props.engagement, o))}
        >
          New pilot on current basis
        </button>
        {option.readiness?.evaluationDataset === "support-fixtures-v1" && (
          <>
            <button
              disabled={props.busy}
              onClick={() =>
                replace(createPilotDraft(props.engagement, o, "target"))
              }
            >
              Load target performance
            </button>
            <button
              disabled={props.busy}
              onClick={() =>
                replace(createPilotDraft(props.engagement, o, "high_review"))
              }
            >
              Load high-review-effort performance
            </button>
          </>
        )}
      </div>
      <fieldset
        disabled={props.busy || props.engagement.archived}
        className="aw-pilot-fields"
      >
        <details open={draft.dirty || !latest} id="pilot-measurements">
          <summary>Measurements and provenance</summary>
          <div className="aw-grid">
            {(
              [
                ["name", "Pilot name"],
                ["owner", "Pilot owner"],
                ["startDate", "Measurement start"],
                ["endDate", "Measurement end"],
                ["source", "Pilot source reference"],
              ] as const
            ).map(([key, label]) => (
              <Field
                key={key}
                label={label}
                type={key.endsWith("Date") ? "date" : "text"}
                value={value[key]}
                onChange={(x) => edit(key, x)}
              />
            ))}
            {(
              [
                ["eligibleCases", "Eligible pilot cases"],
                ["assistedCases", "Assisted pilot cases"],
                ["successfulOutcomes", "Successfully reviewed outcomes"],
                ["unsafeReleased", "Unsafe outcomes released"],
                ["nonLabourSpend", "Actual non-labour spend"],
                ["otherHumanMinutes", "Other recorded human minutes"],
              ] as const
            ).map(([key, label]) => (
              <Field
                key={key}
                label={label}
                type="number"
                value={value[key]}
                onChange={(x) => edit(key, num(x))}
              />
            ))}
          </div>
          <Field
            label="Sample limitations"
            multiline
            value={value.limitations}
            onChange={(x) => edit("limitations", x)}
          />
          <Field
            label="Pilot reviewer rationale"
            multiline
            value={value.rationale}
            onChange={(x) => edit("rationale", x)}
          />
          <p className="aw-muted">
            Task times below are totals for matched timed samples. Handling
            excludes review and exception time. Other human minutes cover
            recorded work outside these rows. Manual comparator time is not
            added to pilot spend. Unrecorded labour must be disclosed in
            limitations; recorded cost is not a completeness guarantee.
          </p>
          <div
            className="aw-table-wrap"
            role="region"
            aria-label="Pilot timed task observations"
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">Task</th>
                  <th scope="col">Timed count</th>
                  <th scope="col">Manual min</th>
                  <th scope="col">Handling min</th>
                  <th scope="col">Review min</th>
                  <th scope="col">Exceptions</th>
                  <th scope="col">Exception min</th>
                </tr>
              </thead>
              <tbody>
                {value.observations.map((r, i) => {
                  const task = value.forecast.option.taskPlan!.rows.find(
                    (t) => t.id === r.taskId,
                  )!;
                  return (
                    <tr key={r.taskId}>
                      <th scope="row">{task.name}</th>
                      {(
                        [
                          ["sampleCount", "Timed samples"],
                          ["manualMinutes", "Manual total minutes"],
                          ["handlingMinutes", "Handling total minutes"],
                          ["reviewMinutes", "Review total minutes"],
                          ["exceptions", "Exception count"],
                          ["exceptionMinutes", "Exception total minutes"],
                        ] as const
                      ).map(([key, label]) => (
                        <td key={key}>
                          <Field
                            label={`${label} · ${task.name}`}
                            type="number"
                            value={r[key]}
                            onChange={(x) =>
                              edit(
                                "observations",
                                value.observations.map((item, index) =>
                                  index === i
                                    ? { ...item, [key]: num(x) }
                                    : item,
                                ),
                              )
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
        <details id="pilot-thresholds">
          <summary>Performance thresholds and budget</summary>
          <div className="aw-grid">
            <Field
              label="Minimum pilot adoption (%)"
              type="number"
              value={
                value.thresholds.adoption === null
                  ? null
                  : value.thresholds.adoption * 100
              }
              onChange={(x) =>
                edit("thresholds", {
                  ...value.thresholds,
                  adoption: num(x) === null ? null : Number(x) / 100,
                })
              }
            />
            <Field
              label="Minimum reviewed success (%)"
              type="number"
              value={
                value.thresholds.successRate === null
                  ? null
                  : value.thresholds.successRate * 100
              }
              onChange={(x) =>
                edit("thresholds", {
                  ...value.thresholds,
                  successRate: num(x) === null ? null : Number(x) / 100,
                })
              }
            />
            <Field
              label="Pilot budget ceiling"
              type="number"
              value={value.budget}
              onChange={(x) => edit("budget", num(x))}
            />
          </div>
          <p>
            Zero unsafe releases required. The existing engagement’s investment,
            NPV and payback hurdles remain in force.
          </p>
        </details>
        <div className="aw-actions">
          <button
            disabled={
              !draft.dirty ||
              value.forecast.basis !== pilotBasis(o, option.id) ||
              value.forecast.currency !== props.engagement.currency
            }
            onClick={async () => {
              setError("");
              try {
                const saved = await props.save(
                  "Saved reviewed synthetic pilot revision",
                  (e) => {
                    const current = e.opportunities.find((x) => x.id === o.id)!;
                    Object.assign(current, savePilotRevision(current, value));
                  },
                );
                const p = saved.opportunities
                  .find((x) => x.id === o.id)!
                  .pilots!.at(-1)!;
                draft.reset();
                setReviewing(null);
                setNotice(
                  `Saved pilot revision ${p.name}. Forecast preserved; assumptions unchanged.`,
                );
              } catch (cause) {
                setError(errorText(cause));
              }
            }}
          >
            Save pilot revision
          </button>
          <button
            disabled={!draft.dirty}
            onClick={() => {
              if (
                window.confirm(
                  "Discard this unsaved pilot draft? Saved revisions are preserved.",
                )
              ) {
                draft.reset();
                setReviewing(null);
              }
            }}
          >
            Discard pilot draft
          </button>
          <button
            disabled={!latest || draft.dirty || result.stale || !!applied}
            onClick={() => {
              setReviewing({ id: latest!.id, basis: pilotBasis(o, option.id) });
              setError("");
            }}
          >
            Review proposed assumption updates
          </button>
        </div>
      </fieldset>
      {reviewing && (
        <div
          className="aw-callout aw-stack"
          aria-label="Reviewed pilot application"
        >
          <h3>Review proposed assumption updates</h3>
          <p>
            Only the selected option’s adoption, handling, review and exceptions
            change. Shared manual baseline, cash mechanism, eligibility and
            costs stay unchanged.
          </p>
          <div className="aw-table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Field</th>
                  <th scope="col">Forecast</th>
                  <th scope="col">Proposed</th>
                </tr>
              </thead>
              <tbody>
                {result.changes.map((c) => (
                  <tr key={c.field}>
                    <th scope="row">
                      {c.field.startsWith("tasks.")
                        ? `${value.forecast.option.taskPlan!.rows.find((t) => t.id === c.field.split(".")[1])?.name} / ${c.field.split(".")[2]}`
                        : c.field}
                    </th>
                    <td>{shown(c.before)}</td>
                    <td>{shown(c.after)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Field
            label="Application owner"
            value={review.value.owner}
            onChange={(owner) => review.set({ ...review.value, owner })}
          />
          <Field
            label="Application rationale"
            multiline
            value={review.value.rationale}
            onChange={(rationale) => review.set({ ...review.value, rationale })}
          />
          <Select
            label="Application confidence"
            value={review.value.confidence}
            onChange={(confidence) =>
              review.set({
                ...review.value,
                confidence: confidence as "low" | "medium" | "high",
              })
            }
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
          <button
            disabled={props.busy || result.stale}
            onClick={async () => {
              setError("");
              try {
                await props.save(
                  "Applied reviewed pilot findings to selected option",
                  (e) => {
                    const current = e.opportunities.find((x) => x.id === o.id)!;
                    Object.assign(
                      current,
                      applyPilotFindings(
                        current,
                        reviewing.id,
                        reviewing.basis,
                        review.value,
                      ),
                    );
                  },
                );
                review.reset();
                setReviewing(null);
                setNotice(
                  "Applied with reviewed evidence. Other options and original forecast preserved; previous recommendations need review.",
                );
              } catch (cause) {
                setError(errorText(cause));
              }
            }}
          >
            Apply reviewed changes
          </button>
          <button onClick={() => setReviewing(null)}>
            Cancel application review
          </button>
        </div>
      )}
      {applied && (
        <p className="aw-callout">
          Applied with reviewed evidence · {applied.owner} · {applied.at}.{" "}
          {applied.rationale}
        </p>
      )}
      {pilots.length > 0 && (
        <details>
          <summary>Saved pilot history · {pilots.length} revisions</summary>
          {[...pilots].reverse().map((p) => (
            <div key={p.id} className="aw-pilot-history">
              <strong>{p.name}</strong>
              <p>
                {p.at} · {p.owner} · {p.source}
              </p>
              <button onClick={() => replace(p)}>
                Inspect / revise {p.name}
              </button>
            </div>
          ))}
        </details>
      )}
      <ErrorMessage error={error} />
      <p role="status" aria-live="polite">
        {notice}
      </p>
    </section>
  );
}
