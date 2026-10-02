import { useState } from "react";
import {
  replaySupport,
  replayReportingNarrative,
  evaluationMetrics,
  reportingEvaluation,
  reportingFixture,
  runReporting,
} from "../evaluation";
import type { SurfaceProps } from "./surface";
import { Field, ErrorMessage, errorText } from "./fields";
import { useDraft } from "./drafts";
import { Workflow } from "./workflow";
export function EvaluationSurface(props: SurfaceProps) {
  if (!props.opportunity)
    return (
      <section className="aw-panel">
        <h1>Agent & Evaluation</h1>
        <p>Create an opportunity first.</p>
      </section>
    );
  return <EvaluationContent key={props.opportunity.id} {...props} />;
}
function EvaluationContent(props: SurfaceProps) {
  const o = props.opportunity!,
    selected = o.options.find((x) => x.id === o.selectedOptionId)!,
    csv = useDraft(`${o.id}:reporting-csv`, reportingFixture),
    [error, setError] = useState(""),
    [selectedRun, setSelectedRun] = useState("");
  const run =
      o.evaluations?.find((x) => x.id === selectedRun) ?? o.evaluations?.at(-1),
    m = run ? evaluationMetrics(run) : null;
  async function execute(mode: "support" | "reporting" | "narrative") {
    try {
      await props.save(
        `Stored ${mode === "support" ? "synthetic support replay" : mode === "narrative" ? "recorded reporting narrative comparison" : "local reporting evaluation"}`,
        (e) => {
          const target = e.opportunities.find((x) => x.id === o.id)!;
          const result =
            mode === "support"
              ? replaySupport(selected.id, target.revision + 1)
              : mode === "narrative"
                ? replayReportingNarrative(selected.id, target.revision + 1)
                : reportingEvaluation(
                    selected.id,
                    target.revision + 1,
                    csv.value,
                  );
          target.evaluations = [...(target.evaluations ?? []), result];
        },
      );
      setError("");
    } catch (cause) {
      setError(errorText(cause));
    }
  }
  return (
    <div className="aw-stack">
      <p className="aw-eyebrow">04 / Architecture & evaluation</p>
      <h1>Agent & Evaluation</h1>
      <p>
        Inspect responsibilities, source use, exceptions and the human control.
        This is not live LLM performance.
      </p>
      <Workflow {...props} />
      {selected.readiness?.evaluationDataset && (
        <p className="aw-callout">
          Investment gate requires {selected.readiness.evaluationDataset} for{" "}
          {selected.name}. An unrelated pipeline cannot clear this option’s
          evaluation requirements.
        </p>
      )}
      <section className="aw-panel aw-stack">
        <h2>Synthetic replay · fixed support dataset</h2>
        <p>
          Four versioned normal/adverse tickets. Recorded outputs, no API calls.
          Edited tickets are not supported; no response is invented. No measured
          latency or actual model cost is claimed.
        </p>
        <button
          className="aw-primary"
          disabled={props.busy || props.engagement.archived}
          onClick={() => void execute("support")}
        >
          Run synthetic support replay
        </button>
      </section>
      <section className="aw-panel aw-stack">
        <h2>Executable local reporting pipeline</h2>
        <p>
          Column validation → Decimal.js totals / variance → structured report.
          Editable synthetic CSV is processed on this device, never uploaded.
        </p>
        <Field
          label="Synthetic reporting CSV"
          multiline
          value={csv.value}
          onChange={csv.set}
        />
        <div className="aw-actions">
          <button
            disabled={props.busy || props.engagement.archived}
            onClick={() => void execute("reporting")}
          >
            Run local reporting rules
          </button>
          <button
            onClick={() => {
              try {
                const r = runReporting(csv.value);
                props.inspect({
                  title: "Local structured reporting output",
                  content: <pre>{JSON.stringify(r, null, 2)}</pre>,
                });
                setError("");
              } catch (cause) {
                setError(errorText(cause));
              }
            }}
          >
            Preview totals & variances
          </button>
        </div>
        <p className="aw-callout">
          Recorded AI comparison: narrative fixture proposes “all budgets
          exceeded”. The rules calculate per-row variances, exposing
          under-budget departments. This recorded example illustrates why AI
          narration needs reconciliation; it is not a live benchmark.
        </p>
        <button
          disabled={props.busy || props.engagement.archived}
          onClick={() => void execute("narrative")}
        >
          Compare fixed recorded AI narrative
        </button>
        <small>
          This uses only the original fixed synthetic CSV, not your edited
          input. Recorded claims and reconciled failures are saved for
          inspection.
        </small>
      </section>
      <ErrorMessage error={error} />
      {run && m ? (
        <section className="aw-panel aw-stack">
          <h2>
            Stored evaluation ·{" "}
            {run.mode === "synthetic_replay"
              ? "Synthetic Replay"
              : "Local rules"}
          </h2>
          <p>
            {run.datasetVersion} · {run.at} · input revision {run.inputRevision}
            {run.inputRevision !== o.revision
              ? " · STALE against current case"
              : " · current case"}
          </p>
          <p>
            Linked option: {o.options.find((x) => x.id === run.optionId)?.name}.
            Only its required dataset can establish readiness.
          </p>
          <div className="aw-readiness">
            <div>
              <span>Cases</span>
              <strong>{m.total}</strong>
            </div>
            <div>
              <span>Correct labels / values</span>
              <strong>
                {m.correct}/{m.total}
              </strong>
            </div>
            <div>
              <span>Unsupported proposals</span>
              <strong>{m.unsupported}</strong>
            </div>
            <div>
              <span>Unsafe releases</span>
              <strong>{m.unsafeReleased}</strong>
            </div>
          </div>
          {run.cases.map((c) => (
            <details key={c.id} className="aw-evaluation-case">
              <summary>
                {c.input} ·{" "}
                {c.expected === c.output
                  ? "Expected label/value"
                  : "FAILED label/value"}
              </summary>
              <p>
                Expected: {c.expected} · Recorded/calculated: {c.output}
              </p>
              <p>Sources: {c.sourceRefs.join("; ")}</p>
              <p>
                <strong>Control:</strong> {c.control}
              </p>
              <ol className="aw-timeline">
                {c.events.map((event, i) => (
                  <li key={i}>
                    <strong>{event.stage}</strong>
                    <p>{event.detail}</p>
                  </li>
                ))}
              </ol>
            </details>
          ))}
          <button
            onClick={() =>
              props.inspect({
                title: "Evaluation finding → assumption review",
                content: (
                  <>
                    <p>
                      {m.total - m.correct} failed labels/values and{" "}
                      {m.unsupported} unsupported proposals. Review whether
                      exception frequency, human review time and quality
                      thresholds are sufficiently conservative.
                    </p>
                    <p>
                      No automatic financial overwrite. Edit task assumptions,
                      assign evidence and save a revision only after review.
                    </p>
                    <button
                      onClick={() =>
                        props.navigate({
                          section: "options",
                          recordId: run.optionId,
                        })
                      }
                    >
                      Review linked option assumptions
                    </button>
                  </>
                ),
              })
            }
          >
            Review proposed assumption changes
          </button>
        </section>
      ) : (
        <p className="aw-callout">
          No evaluation saved. Run a clearly labelled fixture replay or local
          reporting pipeline.
        </p>
      )}
      {!!o.evaluations?.length && (
        <section className="aw-panel">
          <h2>Run history</h2>
          {o.evaluations
            .slice()
            .reverse()
            .map((r) => (
              <button key={r.id} onClick={() => setSelectedRun(r.id)}>
                {r.mode} · {r.at} · r{r.inputRevision}
              </button>
            ))}
        </section>
      )}
    </div>
  );
}
