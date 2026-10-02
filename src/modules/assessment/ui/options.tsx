import { useState } from "react";
import type { SurfaceProps } from "./surface";
import { OptionEditor } from "./option-editor";
import { Provenance } from "./provenance";
import { Comparison } from "./financial-results";
import { Scenarios } from "./scenarios";
import { Simulation } from "./simulation";
import { ErrorMessage, errorText } from "./fields";
import { useDrafts } from "./drafts";
export function Options(props: SurfaceProps) {
  const drafts = useDrafts();
  const [selected, setSelected] = useState(""),
    [error, setError] = useState("");
  const o = props.opportunity;
  if (!o)
    return (
      <section className="aw-panel">
        <h1>Options & Value</h1>
        <p>Add an opportunity in Brief to begin.</p>
        <button onClick={() => props.navigate({ section: "brief" })}>
          Open Brief
        </button>
      </section>
    );
  const targetAssumption = o.assumptions.find((a) => a.id === props.recordId);
  const option =
    o.options.find(
      (x) =>
        x.id === (targetAssumption?.optionId || props.recordId || selected),
    ) ?? o.options.find((x) => x.id === o.selectedOptionId)!;
  const bau = o.options.find((x) => x.kind === "bau")!;
  return (
    <div className="aw-stack">
      <div>
        <p className="aw-eyebrow">03 / Investment case</p>
        <h1>Options & Value</h1>
        <p>
          Compare interventions against the same baseline. Make uncertainty and
          ownership visible.
        </p>
      </div>
      <div className="aw-actions" aria-label="Option selector">
        {o.options.map((x) => (
          <button
            key={x.id}
            aria-pressed={option.id === x.id}
            onClick={() => {
              setSelected(x.id);
              if (props.recordId) props.navigate({ section: "options" });
            }}
          >
            {x.name}
          </button>
        ))}
      </div>
      <p className="aw-muted">
        Recommendation base:{" "}
        {o.options.find((x) => x.id === o.selectedOptionId)?.name}. Viewing
        another option does not change that selection.
      </p>
      {option.id !== o.selectedOptionId && (
        <button
          disabled={props.busy}
          onClick={async () => {
            setError("");
            try {
              await props.save(
                `Selected recommendation option: ${option.name}`,
                (e) => {
                  e.opportunities.find((x) => x.id === o.id)!.selectedOptionId =
                    option.id;
                },
              );
            } catch (cause) {
              setError(errorText(cause));
            }
          }}
        >
          Use {option.name} for recommendation
        </button>
      )}
      <ErrorMessage error={error} />
      <Comparison
        opportunity={drafts.project(o)}
        currency={props.engagement.currency}
        inspect={props.inspect}
      />
      <p className="aw-muted">
        Comparison above includes retained working drafts. Save a revision
        before recording a recommendation or exporting.
      </p>
      <div id="base-assumptions">
        <OptionEditor key={option.id} option={option} {...props} />
      </div>
      <Provenance
        key={`${option.id}:${props.recordId ?? ""}`}
        option={option}
        {...props}
      />
      <Scenarios
        key={`${option.id}:${o.revision}`}
        option={option}
        bau={bau}
        {...props}
      />
      {option.kind !== "bau" && (
        <Simulation
          key={`${option.id}:${o.id}`}
          option={option}
          bau={bau}
          {...props}
        />
      )}
    </div>
  );
}
