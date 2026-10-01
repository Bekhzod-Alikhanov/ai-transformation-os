import { useEffect, useRef, useState } from "react";
import type { SolutionOption, SimulationSummary } from "../types";
import type { SimulationRanges, TriangularRange } from "../economics";
import type {
  SimulationRequest,
  SimulationResponse,
} from "./simulation.worker";
import type { SurfaceProps } from "./surface";
import { useDraft } from "./drafts";
import { Field, ErrorMessage, errorText } from "./fields";
import { saveSimulation } from "./investment-operations";
import { formatMetric } from "./financial-results";
type Draft = {
  seed: number;
  adoption: TriangularRange;
  reduction: TriangularRange;
  costMultiplier: TriangularRange;
};
export function Simulation({
  option,
  bau,
  ...props
}: SurfaceProps & { option: SolutionOption; bau: SolutionOption }) {
  const worker = useRef<Worker | null>(null),
    [status, setStatus] = useState(""),
    [error, setError] = useState("");
  const [pending, setPending] = useState<{
      summary: SimulationSummary;
      resetDraft: () => void;
    } | null>(null),
    [running, setRunning] = useState(false);
  const around = (n: number | null) => ({
    min: Math.max(0, (n ?? 0) - 0.1),
    mode: n ?? 0,
    max: Math.min(1, (n ?? 0) + 0.1),
  });
  const draft = useDraft<Draft>(
    `${option.id}:simulation`,
    option.simulation
      ? { seed: option.simulation.seed, ...option.simulation.ranges }
      : {
          seed: 42,
          adoption: around(option.inputs.adoption),
          reduction: around(option.inputs.reduction),
          costMultiplier: { min: 0.8, mode: 1, max: 1.2 },
        },
  );
  useEffect(
    () => () => {
      worker.current?.terminate();
      worker.current = null;
    },
    [],
  );
  const o = props.opportunity!,
    summary = option.simulation;
  function cancel() {
    worker.current?.terminate();
    worker.current = null;
    setRunning(false);
    setStatus("Cancelled. No result was saved.");
  }
  function start() {
    setError("");
    setPending(null);
    try {
      if (worker.current) worker.current.terminate();
      const w = new Worker(new URL("./simulation.worker.ts", import.meta.url));
      worker.current = w;
      const ranges: SimulationRanges = {
        inputRevision: o.revision,
        adoption: draft.value.adoption,
        reduction: draft.value.reduction,
        costMultiplier: draft.value.costMultiplier,
      };
      w.onmessage = (event: MessageEvent<SimulationResponse>) => {
        if (worker.current !== w) return;
        w.terminate();
        worker.current = null;
        setRunning(false);
        if (event.data.ok) {
          setPending({ summary: event.data.summary, resetDraft: draft.reset });
          setStatus("Simulation complete. Save the summary to this option.");
        } else {
          setError(event.data.error);
          setStatus("Simulation failed. No result was saved.");
        }
      };
      w.onerror = () => {
        if (worker.current !== w) return;
        w.terminate();
        worker.current = null;
        setRunning(false);
        setStatus("Simulation failed.");
        setError(
          "The simulation worker could not complete. Check browser support and input ranges, then retry.",
        );
      };
      w.postMessage(
        structuredClone({
          option,
          bau,
          seed: draft.value.seed,
          ranges,
        } satisfies SimulationRequest),
      );
      setRunning(true);
      setStatus("Running 10,000 draws in a local worker…");
    } catch (cause) {
      worker.current?.terminate();
      worker.current = null;
      setRunning(false);
      setError(errorText(cause));
      setStatus("Simulation failed.");
    }
  }
  return (
    <section className="aw-panel aw-stack">
      <h2>Uncertainty simulation</h2>
      <p className="aw-muted">
        10,000 independent triangular draws; correlations are not modelled. This
        describes the specified assumptions, not the chance that a real project
        will succeed or the probability that evidence is true. Changing option
        or leaving this surface cancels an active run.
      </p>
      <details>
        <summary>Seed & triangular ranges</summary>
        <div className="aw-stack">
          <Field
            label="Simulation seed"
            type="number"
            value={draft.value.seed}
            onChange={(s) =>
              draft.set({ ...draft.value, seed: s === "" ? NaN : Number(s) })
            }
          />
          {(["adoption", "reduction", "costMultiplier"] as const).map(
            (field) => (
              <fieldset key={field}>
                <legend>
                  {field}{" "}
                  {field === "costMultiplier"
                    ? "(multiplier)"
                    : "(fraction, 0–1)"}
                </legend>
                <div className="aw-grid">
                  {(["min", "mode", "max"] as const).map((key) => (
                    <Field
                      key={key}
                      label={`${field} ${key}`}
                      type="number"
                      value={draft.value[field][key]}
                      onChange={(s) =>
                        draft.set({
                          ...draft.value,
                          [field]: {
                            ...draft.value[field],
                            [key]: s === "" ? NaN : Number(s),
                          },
                        })
                      }
                    />
                  ))}
                </div>
              </fieldset>
            ),
          )}
        </div>
      </details>
      <div className="aw-actions">
        <button disabled={running || props.busy} onClick={start}>
          Run 10,000 draws
        </button>
        {running && <button onClick={cancel}>Cancel simulation</button>}
        {pending && (
          <button
            disabled={props.busy}
            onClick={async () => {
              setError("");
              try {
                await props.save(`Saved simulation: ${option.name}`, (e) => {
                  const target = e.opportunities.find((x) => x.id === o.id)!;
                  Object.assign(
                    target,
                    saveSimulation(target, option.id, pending.summary),
                  );
                });
                setPending((current) => (current === pending ? null : current));
                pending.resetDraft();
                setStatus("Simulation summary saved.");
              } catch (cause) {
                setError(errorText(cause));
              }
            }}
          >
            Save simulation summary
          </button>
        )}
      </div>
      <p role="status">{status}</p>
      <ErrorMessage error={error} />
      {pending && (
        <p>
          Unsaved run · P50 NPV{" "}
          {formatMetric(
            pending.summary.p50,
            "money",
            props.engagement.currency,
          )}{" "}
          · seed {pending.summary.seed} · source revision{" "}
          {pending.summary.inputRevision}
        </p>
      )}
      {summary && (
        <div className="aw-callout">
          <strong>
            {summary.inputRevision === o.revision
              ? "Saved simulation"
              : "Stale simulation — rerun for current inputs"}
          </strong>
          <p>
            Seed {summary.seed} · {summary.draws.toLocaleString()} draws ·{" "}
            {summary.modelVersion} · source revision {summary.inputRevision},
            current revision {o.revision}
          </p>
          <p>
            P10 {formatMetric(summary.p10, "money", props.engagement.currency)}{" "}
            · P50{" "}
            {formatMetric(summary.p50, "money", props.engagement.currency)} ·
            P90 {formatMetric(summary.p90, "money", props.engagement.currency)}
          </p>
          <p>
            Economic payback probability:{" "}
            {formatMetric(summary.paybackProbability, "percent")}
          </p>
          <p>{summary.methodology}</p>
          <details>
            <summary>Stored ranges & distribution</summary>
            <pre>
              {JSON.stringify(
                { ranges: summary.ranges, histogram: summary.histogram },
                null,
                2,
              )}
            </pre>
          </details>
        </div>
      )}
    </section>
  );
}
