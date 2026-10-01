import { useState } from "react";
import { recordRecommendation, isRecommendationStale } from "../model";
import { calculateOption } from "../economics";
import { outcomeSchema, type RecommendationInput } from "../types";
import type { SurfaceProps } from "./surface";
import { useDraft } from "./drafts";
import { Field, Select, ErrorMessage, errorText } from "./fields";
import { ReadinessControls } from "./readiness";
import { Validation } from "./validation";
import { formatMetric } from "./financial-results";
export function Recommendation(props: SurfaceProps) {
  if (!props.opportunity)
    return (
      <section className="aw-panel">
        <h1>Recommendation</h1>
        <p>Add an opportunity in Brief to begin.</p>
        <button onClick={() => props.navigate({ section: "brief" })}>
          Open Brief
        </button>
      </section>
    );
  return <RecommendationContent key={props.opportunity.id} {...props} />;
}
function RecommendationContent(props: SurfaceProps) {
  const o = props.opportunity!,
    [error, setError] = useState("");
  const draft = useDraft<RecommendationInput>(`${o.id}:recommendation`, {
    outcome: "Investigate",
    rationale: "",
    conditions: "",
    alternativesRejected: "",
    nextDecisionDate: "",
    strategicException: "",
  });
  const option = o.options.find((x) => x.id === o.selectedOptionId)!,
    bau = o.options.find((x) => x.kind === "bau")!,
    result = calculateOption(option, bau);
  return (
    <div className="aw-stack">
      <div>
        <p className="aw-eyebrow">04 / Advisory decision</p>
        <h1>Recommendation</h1>
        <p>
          Record a reasoned decision with its evidence and investment basis.
        </p>
      </div>
      <ReadinessControls {...props} />
      <section className="aw-panel aw-stack">
        <h2>Recommendation composer</h2>
        <p className="aw-callout">
          Basis: saved {option.name} base assumptions, opportunity revision{" "}
          {o.revision}. What-if scenarios do not change this base. Saved-base
          NPV: {formatMetric(result.npv, "money", props.engagement.currency)}.
          To change the basis, explicitly save base assumptions with provenance
          in Options & Value.
        </p>
        <Select
          label="Recommendation outcome"
          value={draft.value.outcome}
          onChange={(outcome) =>
            draft.set({
              ...draft.value,
              outcome: outcome as RecommendationInput["outcome"],
            })
          }
        >
          {outcomeSchema.options.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </Select>
        <Field
          label="Recommendation rationale"
          multiline
          value={draft.value.rationale}
          onChange={(rationale) => draft.set({ ...draft.value, rationale })}
        />
        <Field
          label="Recommendation conditions"
          multiline
          value={draft.value.conditions}
          onChange={(conditions) => draft.set({ ...draft.value, conditions })}
        />
        <Field
          label="Alternatives rejected"
          multiline
          value={draft.value.alternativesRejected}
          onChange={(alternativesRejected) =>
            draft.set({ ...draft.value, alternativesRejected })
          }
        />
        <Field
          label="Next decision date"
          type="date"
          value={draft.value.nextDecisionDate}
          onChange={(nextDecisionDate) =>
            draft.set({ ...draft.value, nextDecisionDate })
          }
        />
        <Field
          label="Strategic exception rationale"
          multiline
          value={draft.value.strategicException}
          onChange={(strategicException) =>
            draft.set({ ...draft.value, strategicException })
          }
        />
        <p className="aw-muted">
          A strategic exception can explain an investment recommendation despite
          adverse economics. It preserves the computed adverse result and cannot
          waive evidence, controls, budget or readiness gates. Recommendation is
          advisory, not approval.
        </p>
        <ErrorMessage error={error} />
        <button
          className="aw-primary"
          disabled={props.busy}
          onClick={async () => {
            setError("");
            try {
              await props.save(
                `Recorded recommendation: ${draft.value.outcome}`,
                (e) => {
                  const recorded = recordRecommendation(e, o.id, draft.value);
                  e.opportunities.find((x) => x.id === o.id)!.recommendations =
                    recorded.opportunities.find(
                      (x) => x.id === o.id,
                    )!.recommendations;
                },
              );
              draft.reset();
            } catch (cause) {
              setError(errorText(cause));
            }
          }}
        >
          Record recommendation
        </button>
      </section>
      <section className="aw-panel aw-stack">
        <h2>Immutable recommendation history</h2>
        {o.recommendations.length === 0 ? (
          <p>No recommendation recorded yet.</p>
        ) : (
          o.recommendations
            .slice()
            .reverse()
            .map((r) => {
              const selected = r.opportunity.options.find(
                  (x) => x.id === r.opportunity.selectedOptionId,
                )!,
                base = r.opportunity.options.find((x) => x.kind === "bau")!,
                financial = calculateOption(selected, base);
              return (
                <article className="aw-request" key={r.id}>
                  <h3>
                    {r.outcome} ·{" "}
                    {isRecommendationStale(o, r)
                      ? "Stale snapshot"
                      : "Current snapshot"}
                  </h3>
                  <p>
                    {r.at} · source revision {r.sourceRevision} ·{" "}
                    {selected.name} saved base · {r.engagement.currency}
                  </p>
                  <p>{r.rationale}</p>
                  <p>
                    Recorded economic assessment: {r.assessment.outcome} · base
                    NPV{" "}
                    {formatMetric(
                      financial.npv,
                      "money",
                      r.engagement.currency,
                    )}
                  </p>
                  <p>Next decision: {r.nextDecisionDate}</p>
                  <button
                    onClick={() =>
                      props.inspect({
                        title: "Recorded recommendation",
                        content: (
                          <>
                            <p>Immutable snapshot · {r.at}</p>
                            <p>
                              Basis: {selected.name} saved base, revision{" "}
                              {r.sourceRevision}
                            </p>
                            <p>Rationale: {r.rationale}</p>
                            <p>Conditions: {r.conditions || "None recorded"}</p>
                            <p>
                              Rejected alternatives:{" "}
                              {r.alternativesRejected || "None recorded"}
                            </p>
                            <p>
                              Strategic exception:{" "}
                              {r.strategicException || "None"}
                            </p>
                            <p>
                              Economic assessment: {r.assessment.outcome}; NPV{" "}
                              {formatMetric(
                                financial.npv,
                                "money",
                                r.engagement.currency,
                              )}
                            </p>
                            <pre>
                              {JSON.stringify(
                                {
                                  inputs: selected.inputs,
                                  validation: r.opportunity.validation,
                                  dimensions: r.assessment.dimensions,
                                },
                                null,
                                2,
                              )}
                            </pre>
                          </>
                        ),
                      })
                    }
                  >
                    Inspect recorded snapshot
                  </button>
                </article>
              );
            })
        )}
      </section>
      <Validation {...props} />
    </div>
  );
}
