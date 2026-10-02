import type { SurfaceProps } from "./surface";
import { formatMetric } from "./financial-results";
export function Workflow(props: SurfaceProps) {
  const o = props.opportunity!;
  const selected = o.options.find((x) => x.id === o.selectedOptionId)!;
  const bau = o.options.find((x) => x.kind === "bau")!;
  const rows = selected.taskPlan?.rows;
  return (
    <section className="aw-panel aw-stack">
      <h2>Current → proposed operating model</h2>
      <p>
        Selected recommendation basis: {selected.name}. Human minutes are model
        inputs; machine latency is illustrative and excluded from labour
        savings.
      </p>
      <div className="aw-workflow-lanes">
        {[bau, selected].map((option, lane) => (
          <div key={`${lane}:${option.id}`}>
            <h3>{lane === 0 ? "Current · manual" : "Future · proposed"}</h3>
            <div className="aw-workflow-nodes">
              {(option.taskPlan?.rows ?? []).map((task) => (
                <button
                  className={`aw-workflow-node aw-node-${task.responsibility}`}
                  key={task.id}
                  onClick={() =>
                    props.inspect({
                      title: task.name,
                      content: (
                        <>
                          <p>
                            Responsibility: {task.responsibility}. Input:
                            process item / approved source. Output: reviewed
                            work product.
                          </p>
                          <p>
                            Volume {formatMetric(task.annualVolume)} / year;
                            baseline {formatMetric(task.currentMinutes)}{" "}
                            minutes; remaining handling{" "}
                            {formatMetric(task.remainingMinutes)}; human review{" "}
                            {formatMetric(task.reviewMinutes)} minutes.
                          </p>
                          <p>
                            Exception probability{" "}
                            {formatMetric(task.exceptionRate, "percent")};
                            additional handling{" "}
                            {formatMetric(task.exceptionMinutes)} minutes.
                            Loaded rate{" "}
                            {formatMetric(
                              option.inputs.hourlyCost,
                              "money",
                              props.engagement.currency,
                            )}{" "}
                            / hour.
                          </p>
                          <p>
                            {task.assumed
                              ? "Explicit synthetic assumption"
                              : "Evidence linked"}
                            . Source links:{" "}
                            {task.evidenceIds
                              .map(
                                (id) =>
                                  o.evidence.find((e) => e.id === id)?.title ??
                                  "Missing source",
                              )
                              .join("; ") || "None"}
                            .
                          </p>
                          <p>
                            Control: human review; uncertain or unsupported
                            output returns to manual handling. No external
                            actions.
                          </p>
                          <button
                            onClick={() =>
                              props.navigate({
                                section: "options",
                                recordId: option.id,
                              })
                            }
                          >
                            Edit this task model
                          </button>
                        </>
                      ),
                    })
                  }
                >
                  <small>{task.responsibility}</small>
                  <strong>{task.name}</strong>
                  <span>
                    {lane === 0 ? task.currentMinutes : task.remainingMinutes}{" "}
                    min + {lane === 0 ? 0 : task.reviewMinutes} review
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!rows && (
        <p>
          Legacy aggregate model. Convert explicitly in Investment Comparison to
          inspect a task-level workflow; no task detail is invented.
        </p>
      )}
    </section>
  );
}
