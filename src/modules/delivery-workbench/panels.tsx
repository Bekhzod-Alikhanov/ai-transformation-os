"use client";
import { useState } from "react";
import { calculateEconomics } from "./economics";
import { compact, currency, downloadFile, number, percent } from "./exports";
import {
  assessProject,
  evaluateExamples,
  evaluationKey,
  examples,
  parseBaselineCsv,
  type DecisionInput,
  type Evidence,
  type Project,
} from "./model";
import { Metric } from "./business-case";

type PanelProps = {
  project: Project;
  change: (detail: string, update: (p: Project) => void) => void;
};
export function EvidencePanel({ project, change }: PanelProps) {
  const [selectedId, setSelectedId] = useState(project.evidence[0]!.id);
  const selected =
    project.evidence.find((e) => e.id === selectedId) ?? project.evidence[0]!;
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [csv, setCsv] = useState("");
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  function review(status: Evidence["status"]) {
    if (!note.trim()) {
      setMessage("Explain the review or conflict resolution before saving.");
      return;
    }
    change("Evidence " + selected.title + " → " + status + ": " + note, (p) => {
      const e = p.evidence.find((e) => e.id === selected.id)!;
      e.status = status;
      e.note = note;
    });
    setNote("");
    setMessage(
      "Review saved; financial inputs are unchanged until explicitly revised.",
    );
  }
  return (
    <div className="dw-stack">
      <div className="dw-section-heading">
        <div>
          <span className="dw-eyebrow">ESTABLISH THE BASELINE</span>
          <h2>Make the evidence inspectable.</h2>
          <p>
            Review the source, challenge the assumption, and preserve the reason
            for your decision.
          </p>
        </div>
        <span className="dw-chip">
          {project.evidence.filter((e) => e.status === "accepted").length} /{" "}
          {project.evidence.length} accepted
        </span>
      </div>
      <div className="dw-evidence-layout" data-tour="evidence">
        <section
          className="dw-panel dw-source-list"
          aria-label="Evidence sources"
        >
          {project.evidence.map((e) => (
            <button
              key={e.id}
              onClick={() => {
                setSelectedId(e.id);
                setNote("");
              }}
              className={e.id === selected.id ? "selected" : ""}
            >
              <span className={"dw-status " + e.status}>{e.status}</span>
              <strong>{e.title}</strong>
              <small>{e.locator}</small>
            </button>
          ))}
        </section>
        <section className="dw-panel">
          <div className="dw-panel-title">
            <div>
              <span className="dw-eyebrow">SOURCE INSPECTOR</span>
              <h3>{selected.title}</h3>
            </div>
            <span className="dw-chip">
              {selected.provenance.replace("_", " ")}
            </span>
          </div>
          <blockquote>{selected.excerpt}</blockquote>
          <p className="dw-footnote">
            Locator: {selected.locator} · related assumption: {selected.field}
          </p>
          <div className="dw-callout">
            <strong>Current review note</strong>
            <p>{selected.note || "No review note recorded."}</p>
          </div>
          <label>
            Review rationale
            <textarea
              aria-label="Review rationale"
              placeholder="Which source do you accept, what remains uncertain, and who will validate it?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </label>
          <div className="dw-actions">
            <button
              className="dw-btn primary"
              onClick={() => review("accepted")}
            >
              Accept evidence
            </button>
            <button className="dw-btn" onClick={() => review("rejected")}>
              Reject evidence
            </button>
            <button className="dw-btn" onClick={() => review("conflicted")}>
              Flag conflict
            </button>
          </div>
        </section>
      </div>
      <div className="dw-two-column">
        <section className="dw-panel">
          <div className="dw-panel-title">
            <div>
              <h3>Import an annual baseline</h3>
              <p>Local CSV · volume,minutes columns · maximum 5,000 rows</p>
            </div>
          </div>
          <p className="dw-footnote">
            Each row represents an annual workload segment. Volume is summed;
            baseline effort is volume-weighted. No file leaves this browser.
          </p>
          <textarea
            aria-label="Baseline CSV"
            placeholder="volume,minutes"
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={5}
          />
          <div className="dw-actions">
            <label className="dw-btn">
              Choose CSV
              <input
                className="dw-visually-hidden"
                type="file"
                accept=".csv,text/csv"
                aria-label="Choose baseline CSV"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (file.size > 1000000) {
                    setMessage("Use a CSV smaller than 1 MB.");
                    return;
                  }
                  try {
                    setCsv(await file.text());
                  } catch {
                    setMessage("The file could not be read.");
                  }
                }}
              />
            </label>
            <button
              className="dw-btn"
              onClick={() =>
                downloadFile(
                  project.id + "-baseline.csv",
                  project.id === "support"
                    ? "volume,minutes\n20000,11\n18896,13.06\n"
                    : "volume,minutes\n312,160\n312,200\n",
                  "text/csv",
                )
              }
            >
              Sample CSV
            </button>
            <button
              className="dw-btn primary"
              onClick={() => {
                try {
                  const result = parseBaselineCsv(csv);
                  change(
                    "Imported annual baseline from " +
                      result.rows +
                      " CSV rows",
                    (p) => {
                      p.inputs.annualVolume = result.annualVolume;
                      p.inputs.minutesBefore = result.minutesBefore;
                      p.evidence.push({
                        id: crypto.randomUUID(),
                        title: "Imported annual baseline",
                        excerpt:
                          number(result.annualVolume) +
                          " eligible annual tasks, " +
                          result.minutesBefore.toFixed(2) +
                          " weighted baseline minutes.",
                        locator: "Local CSV · rows 2–" + (result.rows + 1),
                        status: "accepted",
                        field: "annualVolume, minutesBefore",
                        note: "Explicitly applied by Beck; validate source coverage before investment.",
                        provenance: "user_provided",
                      });
                    },
                  );
                  setMessage(
                    "Baseline applied and linked to evidence. The business case has recalculated.",
                  );
                } catch (error) {
                  setMessage(
                    error instanceof Error ? error.message : "Invalid CSV.",
                  );
                }
              }}
            >
              Apply baseline
            </button>
          </div>
        </section>
        <section className="dw-panel">
          <div className="dw-panel-title">
            <h3>Add a workshop observation</h3>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!title.trim() || !excerpt.trim()) return;
              change("Added evidence candidate: " + title, (p) => {
                p.evidence.push({
                  id: crypto.randomUUID(),
                  title: title.trim(),
                  excerpt: excerpt.trim(),
                  locator:
                    "Workshop note · Beck · " + new Date().toLocaleDateString(),
                  status: "pending",
                  note: "Awaiting review",
                  provenance: "user_provided",
                  field: "To be linked during review",
                });
              });
              setTitle("");
              setExcerpt("");
              setMessage("Observation saved for review.");
            }}
          >
            <label>
              Observation title
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label>
              Source excerpt or observation
              <textarea
                required
                rows={4}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
              />
            </label>
            <button className="dw-btn" type="submit">
              Save observation
            </button>
          </form>
        </section>
      </div>
      {message ? (
        <p className="dw-notice" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function SolutionPanel({ project, change }: PanelProps) {
  const rows = examples(project.id);
  const [index, setIndex] = useState(0);
  const current = rows[index]!;
  const result = evaluateExamples(project.id);
  const fresh = project.evaluationInput === evaluationKey(project);
  return (
    <div className="dw-stack">
      <div className="dw-section-heading">
        <div>
          <span className="dw-eyebrow">TECHNICAL JUDGMENT</span>
          <h2>A bounded workflow, with accountable review.</h2>
          <p>
            Inspect sample outputs and test the controls before trusting a
            recommendation.
          </p>
        </div>
      </div>
      <div className="dw-workflow">
        {[
          "Source",
          "Retrieve context",
          "Prepare draft",
          "Validate",
          "Human review",
          "Record outcome",
        ].map((step, i) => (
          <div key={step}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            <strong>{step}</strong>
            <small>
              {
                [
                  "Untrusted input",
                  "Approved references",
                  "Sample AI output",
                  "Deterministic checks",
                  "Accountable employee",
                  "Local audit record",
                ][i]
              }
            </small>
          </div>
        ))}
      </div>
      <div className="dw-two-column" data-tour="examples">
        <section className="dw-panel">
          <div className="dw-panel-title">
            <h3>
              {project.id === "support"
                ? "Support ticket review"
                : "Reporting exception review"}
            </h3>
            <span className="dw-chip">
              Fixture {index + 1} / {rows.length}
            </span>
          </div>
          <label>
            Choose an example
            <select
              value={index}
              onChange={(e) => setIndex(Number(e.target.value))}
            >
              {rows.map((row, i) => (
                <option key={row.id} value={i}>
                  {i + 1}. {row.input}
                </option>
              ))}
            </select>
          </label>
          <blockquote>{current.input}</blockquote>
          <dl className="dw-value-list">
            <div>
              <dt>Sample model suggestion</dt>
              <dd>{current.proposal}</dd>
            </div>
            <div>
              <dt>Expected disposition</dt>
              <dd>{current.expected}</dd>
            </div>
            <div>
              <dt>Source citation</dt>
              <dd>{current.citation}</dd>
            </div>
          </dl>
          <p className="dw-footnote">
            Fixtures are authored examples, not recorded live model runs. Their
            scores demonstrate the evaluation method.
          </p>
        </section>
        <section className="dw-panel">
          <div className="dw-panel-title">
            <h3>Control result</h3>
            <span
              className={
                "dw-status " +
                (current.approvedCitation &&
                current.proposal === current.expected
                  ? "accepted"
                  : "conflicted")
              }
            >
              {current.approvedCitation && current.proposal === current.expected
                ? "Supported suggestion"
                : "Review required"}
            </span>
          </div>
          <div className="dw-callout">
            <strong>
              {current.critical
                ? "Critical escalation"
                : "Reviewer responsibility"}
            </strong>
            <p>{current.rationale}</p>
          </div>
          <ul className="dw-check-list">
            <li>
              {current.approvedCitation
                ? "Valid fixture citation"
                : "Unsupported citation — block the claim"}
            </li>
            <li>
              {current.proposal === current.expected
                ? "Disposition matches the expected label"
                : "Disposition mismatch — reviewer must correct"}
            </li>
            <li>
              {current.needsReview
                ? "Human review is required"
                : "Sample is eligible for routine preparation"}
            </li>
            <li>No message, publication or account action is executed.</li>
          </ul>
        </section>
      </div>
      <section className="dw-panel" data-tour="evaluation">
        <div className="dw-panel-title">
          <div>
            <h3>Evaluate the assisted workflow</h3>
            <p>
              {rows.length} inspectable examples · includes ambiguous inputs,
              unsupported claims and malicious instructions
            </p>
          </div>
          <button
            className="dw-btn primary"
            onClick={() =>
              change(
                "Evaluated fixture outputs and confirmed the mandatory human-review boundary",
                (p) => {
                  p.evaluationRevision = p.revision + 1;
                  p.evaluationInput = evaluationKey(p);
                },
              )
            }
          >
            Run evaluation
          </button>
        </div>
        {project.evaluationRevision !== null ? (
          <>
            <p className={"dw-status " + (fresh ? "accepted" : "conflicted")}>
              {fresh
                ? "Current evaluation"
                : "Stale — rerun after evidence or assumption changes"}
            </p>
            <div className="dw-kpis">
              <Metric
                label="Raw disposition accuracy"
                value={percent(result.accuracy)}
                note={
                  rows.filter((r) => r.expected === r.proposal).length +
                  " / " +
                  rows.length +
                  " fixture outputs"
                }
              />
              <Metric
                label="Valid citations"
                value={percent(result.citationValidity)}
                note="Checked against fixture references"
              />
              <Metric
                label="Critical review coverage"
                value={percent(result.criticalEscalation)}
                note="Mandatory human-review rule"
              />
              <Metric
                label="Human-review workload"
                value={percent(result.reviewShare)}
                note="Review time is costed in the model"
              />
            </div>
            <div className="dw-callout amber">
              <strong>
                Unattended automation is not justified by these results.
              </strong>
              <p>
                Unsupported or incorrect suggestions require correction. Passing
                this design check supports a supervised pilot; measured quality
                and adoption are separate scale gates.
              </p>
            </div>
          </>
        ) : (
          <p className="dw-empty">
            Run the local checks to inspect sample quality and the review
            workload.
          </p>
        )}
      </section>
      <details className="dw-panel dw-details">
        <summary>Production architecture and handover discussion</summary>
        <p>
          Approved source connector → access-controlled retrieval → model
          adapter → schema and citation validation → review queue → authorized
          execution. Production delivery also needs identity, telemetry,
          evaluation against representative data, incident response and a named
          service owner.
        </p>
        <p>
          This release runs client-side examples and calculations. Production
          connectors and model execution are outside the interview build.
        </p>
      </details>
    </div>
  );
}

export function DeliveryPanel({ project, change }: PanelProps) {
  const [budget, setBudget] = useState(String(project.budgetCap));
  const [spend, setSpend] = useState(String(project.actualSpend));
  const [message, setMessage] = useState("");
  return (
    <div className="dw-stack">
      <div className="dw-section-heading">
        <div>
          <span className="dw-eyebrow">DELIVERY LEADERSHIP</span>
          <h2>Move the pilot through explicit gates.</h2>
          <p>
            Dependencies, budget and adoption have owners. Changes remain
            visible in the engagement history.
          </p>
        </div>
        <span className="dw-chip">
          {project.tasks.filter((t) => t.done).length} / {project.tasks.length}{" "}
          milestones
        </span>
      </div>
      <div className="dw-kpis">
        <Metric
          label="Approved budget cap"
          value={compact(project.budgetCap)}
          note="Investment authorization ceiling"
        />
        <Metric
          label="Forecast investment"
          value={compact(project.inputs.implementationCost)}
          note="Linked to the business case"
        />
        <Metric
          label="Actual spend to date"
          value={compact(project.actualSpend)}
          note="Included in forecast, not added twice"
        />
        <Metric
          label="Forecast remaining"
          value={compact(
            Math.max(
              0,
              project.inputs.implementationCost - project.actualSpend,
            ),
          )}
          note="Forecast investment less actual spend"
        />
      </div>
      <section className="dw-panel" data-tour="delivery">
        <div className="dw-panel-title">
          <h3>90-day delivery plan</h3>
          <span>Dependencies enforced when completing work</span>
        </div>
        <div className="dw-task-list">
          {project.tasks.map((task) => (
            <div key={task.id}>
              <input
                type="checkbox"
                aria-label={task.title}
                checked={task.done}
                onChange={(e) => {
                  if (
                    e.target.checked &&
                    task.dependency &&
                    !project.tasks.find((t) => t.id === task.dependency)?.done
                  ) {
                    setMessage(
                      "Complete the preceding dependency before this milestone.",
                    );
                    return;
                  }
                  change(
                    (e.target.checked ? "Completed " : "Reopened ") +
                      task.title,
                    (p) => {
                      p.tasks.find((t) => t.id === task.id)!.done =
                        e.target.checked;
                      if (!e.target.checked) {
                        const index = p.tasks.findIndex(
                          (t) => t.id === task.id,
                        );
                        p.tasks.slice(index + 1).forEach((t) => {
                          t.done = false;
                        });
                      }
                    },
                  );
                  setMessage("");
                }}
              />
              <div>
                <strong>{task.title}</strong>
                <small>
                  {task.owner} · {task.phase}
                </small>
              </div>
              <span>Day {task.dueDay}</span>
            </div>
          ))}
        </div>
      </section>
      <div className="dw-two-column">
        <section className="dw-panel">
          <div className="dw-panel-title">
            <h3>Risk and accountability register</h3>
          </div>
          {project.risks.map((risk) => (
            <div className="dw-risk" key={risk.id}>
              <div>
                <span
                  className={
                    "dw-status " + (risk.closed ? "accepted" : "conflicted")
                  }
                >
                  {risk.closed ? "Controlled" : risk.severity}
                </span>
                <strong>{risk.title}</strong>
              </div>
              <p>{risk.mitigation}</p>
              <label className="dw-inline">
                <input
                  type="checkbox"
                  checked={risk.closed}
                  onChange={(e) =>
                    change(
                      (e.target.checked
                        ? "Controlled risk: "
                        : "Reopened risk: ") + risk.title,
                      (p) => {
                        p.risks.find((r) => r.id === risk.id)!.closed =
                          e.target.checked;
                      },
                    )
                  }
                />
                Control in place · {risk.owner}
              </label>
            </div>
          ))}
        </section>
        <section className="dw-panel">
          <div className="dw-panel-title">
            <h3>Budget and scenario workshop</h3>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const cap = Number(budget);
              const actual = Number(spend);
              if (
                !budget.trim() ||
                !spend.trim() ||
                !Number.isFinite(cap) ||
                !Number.isFinite(actual) ||
                cap < 0 ||
                actual < 0
              ) {
                setMessage(
                  "Budget and spend must be finite nonnegative amounts.",
                );
                return;
              }
              change("Revised budget cap and recorded actual spend", (p) => {
                p.budgetCap = cap;
                p.actualSpend = actual;
              });
              setMessage(
                "Budget saved. Actual spend is not added again to forecast investment.",
              );
            }}
          >
            <label>
              Budget cap (USD)
              <input
                type="number"
                min="0"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </label>
            <label>
              Actual spend (USD)
              <input
                type="number"
                min="0"
                value={spend}
                onChange={(e) => setSpend(e.target.value)}
              />
            </label>
            <button className="dw-btn" type="submit">
              Save budget
            </button>
          </form>
          <hr />
          <p className="dw-eyebrow">THE INTERVIEWER CHANGES THE BRIEF</p>
          <div className="dw-stack">
            <button
              className="dw-btn"
              onClick={() => {
                change("Scenario applied: budget cap reduced by 20%", (p) => {
                  p.budgetCap *= 0.8;
                });
                setBudget(String(project.budgetCap * 0.8));
              }}
            >
              Apply 20% budget cut
            </button>
            <button
              className="dw-btn"
              onClick={() =>
                change(
                  "Scenario applied: data access delayed 10 days; incomplete milestones shifted",
                  (p) => {
                    p.tasks
                      .filter((t) => !t.done)
                      .forEach((t) => {
                        t.dueDay += 10;
                      });
                    p.risks.find((r) => r.id === "data")!.closed = false;
                  },
                )
              }
            >
              Apply 10-day data delay
            </button>
          </div>
          <p className="dw-footnote">
            Scenarios modify this local engagement with history. Export a
            workspace backup before exploring alternatives.
          </p>
        </section>
      </div>
      {message ? (
        <p className="dw-notice" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function OutcomesPanel({
  project,
  change,
  decide,
}: PanelProps & { decide: (input: DecisionInput) => void }) {
  const current = project.measurements;
  const [measurement, setMeasurement] = useState({
    adoption: String(current?.adoption ?? 0.38),
    quality: String(current?.quality ?? 0.97),
    minutesAfter: String(
      current?.minutesAfter ?? (project.id === "support" ? 7 : 75),
    ),
    sampleSize: String(current?.sampleSize ?? 240),
    period: current?.period ?? "Pilot weeks 1–4",
    source: current?.source ?? "Workshop-entered pilot summary",
    synthetic: current?.synthetic ?? true,
  });
  const gate = assessProject(project);
  const [choice, setChoice] = useState<DecisionInput["decision"]>(
    gate.recommendation,
  );
  const [rationale, setRationale] = useState("");
  const [conditions, setConditions] = useState("");
  const [owner, setOwner] = useState("Beck");
  const [followUp, setFollowUp] = useState("");
  const [override, setOverride] = useState("");
  const [message, setMessage] = useState("");
  const measured = current
    ? calculateEconomics({
        ...project.inputs,
        adoption: current.adoption,
        reduction: Math.max(
          0,
          1 - current.minutesAfter / project.inputs.minutesBefore,
        ),
        reviewMinutes: 0,
      })
    : null;
  const decisions = project.decisions.slice().reverse();
  return (
    <div className="dw-stack">
      <div className="dw-section-heading">
        <div>
          <span className="dw-eyebrow">MEASURE BEFORE YOU SCALE</span>
          <h2>Did the promised value materialize?</h2>
          <p>
            Compare the pilot with the investment thesis. Annualized projections
            remain distinct from observed pilot results.
          </p>
        </div>
      </div>
      <div className="dw-two-column" data-tour="pilot">
        <section className="dw-panel">
          <div className="dw-panel-title">
            <h3>Pilot measurement record</h3>
            <button
              className="dw-btn"
              onClick={() => {
                const sample = {
                  adoption: "0.38",
                  quality: project.id === "support" ? "0.97" : "0.99",
                  minutesAfter: project.id === "support" ? "7" : "75",
                  sampleSize: project.id === "support" ? "240" : "40",
                  period: "Synthetic pilot · weeks 1–4",
                  source: "Authored low-adoption fixture",
                  synthetic: true,
                };
                setMeasurement(sample);
              }}
            >
              Load adoption setback
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              try {
                change(
                  "Recorded " +
                    (measurement.synthetic ? "synthetic" : "user-provided") +
                    " pilot measurements",
                  (p) => {
                    p.measurements = {
                      adoption: Number(measurement.adoption),
                      quality: Number(measurement.quality),
                      minutesAfter: Number(measurement.minutesAfter),
                      sampleSize: Number(measurement.sampleSize),
                      period: measurement.period,
                      source: measurement.source,
                      synthetic: measurement.synthetic,
                    };
                  },
                );
                setMessage(
                  "Pilot measurements saved; the scale recommendation has recalculated.",
                );
              } catch {
                setMessage(
                  "Check the measurement values, sample size, period and source.",
                );
              }
            }}
          >
            <div className="dw-input-grid two">
              {(
                [
                  ["adoption", "Observed adoption (0–1)"],
                  ["quality", "Observed quality (0–1)"],
                  ["minutesAfter", "Human effort after (minutes)"],
                  ["sampleSize", "Sample size"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    type="number"
                    required
                    min={key === "sampleSize" ? 1 : 0}
                    max={
                      key === "quality" || key === "adoption" ? 1 : undefined
                    }
                    step={key === "sampleSize" ? 1 : 0.01}
                    value={measurement[key]}
                    onChange={(e) =>
                      setMeasurement({ ...measurement, [key]: e.target.value })
                    }
                  />
                </label>
              ))}
            </div>
            <label>
              Measurement period
              <input
                required
                value={measurement.period}
                onChange={(e) =>
                  setMeasurement({ ...measurement, period: e.target.value })
                }
              />
            </label>
            <label>
              Measurement source
              <input
                required
                value={measurement.source}
                onChange={(e) =>
                  setMeasurement({ ...measurement, source: e.target.value })
                }
              />
            </label>
            <label className="dw-inline">
              <input
                type="checkbox"
                checked={measurement.synthetic}
                onChange={(e) =>
                  setMeasurement({
                    ...measurement,
                    synthetic: e.target.checked,
                  })
                }
              />
              These are synthetic demonstration measurements
            </label>
            <p className="dw-footnote">
              Human effort after includes all review and exception handling; it
              is not deducted twice.
            </p>
            <button className="dw-btn primary" type="submit">
              Save measurements
            </button>
          </form>
        </section>
        <section className="dw-panel">
          <div className="dw-panel-title">
            <h3>Target versus observation</h3>
            <span>
              {current
                ? current.synthetic
                  ? "Synthetic pilot"
                  : "User-provided"
                : "Awaiting measurements"}
            </span>
          </div>
          <dl className="dw-value-list">
            <div>
              <dt>Adoption threshold</dt>
              <dd>
                {current ? percent(current.adoption) : "—"} /{" "}
                {project.id === "support" ? "65%" : "70%"}
              </dd>
            </div>
            <div>
              <dt>Quality threshold</dt>
              <dd>
                {current ? percent(current.quality) : "—"} /{" "}
                {project.id === "support" ? "95%" : "98%"}
              </dd>
            </div>
            <div>
              <dt>Handling-effort reduction</dt>
              <dd>
                {current
                  ? percent(
                      1 - current.minutesAfter / project.inputs.minutesBefore,
                    )
                  : "—"}{" "}
                / {project.id === "support" ? "25%" : "40%"}
              </dd>
            </div>
            <div>
              <dt>Planned annual hours released</dt>
              <dd>
                {number(calculateEconomics(project.inputs).annualHoursSaved)}
              </dd>
            </div>
            <div>
              <dt>Annualized from pilot</dt>
              <dd>{measured ? number(measured.annualHoursSaved) : "—"}</dd>
            </div>
          </dl>
          <p className="dw-footnote">
            The annualized value extrapolates the supplied sample using the
            annual workload. It is not a full year of measured savings.
          </p>
          <div className={"dw-gate " + (gate.scaleBlocked ? "amber" : "green")}>
            <span className="dw-eyebrow">CURRENT RECOMMENDATION</span>
            <h3>{gate.recommendation}</h3>
            <p>{gate.reasons[0]}</p>
          </div>
        </section>
      </div>
      <section className="dw-panel" data-tour="decision">
        <div className="dw-panel-title">
          <div>
            <h3>Record a governed decision</h3>
            <p>
              A recommendation informs the sponsor; it does not authorize
              investment by itself.
            </p>
          </div>
          <span className="dw-chip">Revision {project.revision}</span>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            try {
              decide({
                decision: choice,
                rationale,
                conditions,
                owner,
                followUp,
                override,
              });
              setMessage(
                "Decision recorded with an immutable local snapshot of this revision.",
              );
            } catch (error) {
              setMessage(
                error instanceof Error
                  ? error.message
                  : "Decision could not be saved.",
              );
            }
          }}
        >
          <div className="dw-input-grid two">
            <label>
              Decision
              <select
                aria-label="Decision"
                value={choice}
                onChange={(e) =>
                  setChoice(e.target.value as DecisionInput["decision"])
                }
              >
                {(
                  [
                    "Pilot",
                    "Scale",
                    "Scale with conditions",
                    "Fix",
                    "Pause",
                    "Stop",
                  ] as const
                ).map((d) => (
                  <option
                    key={d}
                    value={d}
                    disabled={gate.scaleBlocked && d.startsWith("Scale")}
                  >
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Accountable owner
              <input
                required
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
              />
            </label>
          </div>
          <label>
            Decision rationale
            <textarea
              required
              rows={3}
              placeholder="What does the evidence support, and why is this the appropriate next step?"
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
            />
          </label>
          <label>
            Conditions and next actions
            <textarea
              rows={2}
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="Named actions and acceptance criteria"
            />
          </label>
          <div className="dw-input-grid two">
            <label>
              Follow-up date
              <input
                type="date"
                required
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
              />
            </label>
            <label>
              Override explanation
              <input
                value={override}
                onChange={(e) => setOverride(e.target.value)}
                placeholder="Required when departing from the recommendation"
              />
            </label>
          </div>
          <button className="dw-btn primary" type="submit">
            Record decision
          </button>
        </form>
      </section>
      {decisions.length ? (
        <section className="dw-panel">
          <div className="dw-panel-title">
            <h3>Decision history</h3>
            <span>Latest first · prior snapshots preserved</span>
          </div>
          {decisions.map((d) => (
            <article className="dw-decision" key={d.id}>
              <div>
                <strong>{d.decision}</strong>
                <span
                  className={
                    "dw-status " +
                    (d.revision === project.revision
                      ? "accepted"
                      : "conflicted")
                  }
                >
                  {d.revision === project.revision
                    ? "Current"
                    : "Stale — reassess"}
                </span>
              </div>
              <p>{d.rationale}</p>
              <small>
                {d.owner} · {new Date(d.at).toLocaleString()} · revision{" "}
                {d.revision} · follow-up {d.followUp}
              </small>
              <p className="dw-footnote">
                Conditions: {d.conditions || "None"} · snapshot NPV{" "}
                {currency(d.snapshot.economicNpv)}
              </p>
            </article>
          ))}
        </section>
      ) : null}
      {message ? (
        <p role="status" className="dw-notice">
          {message}
        </p>
      ) : null}
    </div>
  );
}
