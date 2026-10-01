import { useState } from "react";
import { assessOpportunity } from "../assessment";
import { createOpportunity } from "../model";
import type { Currency } from "../types";
import type { SurfaceProps } from "./surface";
import { useDraft } from "./drafts";
import { Field, Select, ErrorMessage, errorText } from "./fields";
import { ProcessEditor } from "./process-editor";

const briefFields = {
  name: "Engagement name",
  client: "Client",
  sponsor: "Sponsor",
  processOwner: "Process owner",
  lead: "Assessment lead",
  problem: "Problem",
  objectives: "Objectives",
  constraints: "Constraints",
  assessmentDate: "Assessment date",
  decisionDeadline: "Decision deadline",
} as const;
export function Brief(props: SurfaceProps) {
  const { engagement, opportunity, save, busy } = props;
  const initial = Object.fromEntries(
    Object.keys(briefFields).map((key) => [
      key,
      engagement[key as keyof typeof briefFields],
    ]),
  ) as Pick<typeof engagement, keyof typeof briefFields>;
  const brief = useDraft(`brief:${engagement.id}`, {
    ...initial,
    currency: engagement.currency,
    acknowledged: false,
  });
  const add = useDraft(`new-opportunity:${engagement.id}`, "");
  const [error, setError] = useState("");
  return (
    <div className="aw-stack">
      <section className="aw-panel">
        <div className="aw-section-heading">
          <div>
            <p className="aw-eyebrow">01 / Frame the decision</p>
            <h1 className="aw-surface-title">Engagement brief</h1>
          </div>
          <span className="aw-tag">
            {engagement.currency} · revision {engagement.revision}
          </span>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            try {
              if (!brief.value.name.trim())
                throw new Error("Give the engagement a human-readable name.");
              if (
                brief.value.currency !== engagement.currency &&
                !brief.value.acknowledged
              )
                throw new Error(
                  "Acknowledge that changing currency does not convert numbers.",
                );
              const { acknowledged: _ack, ...values } = brief.value;
              void _ack;
              await save("Updated engagement brief", (draft) =>
                Object.assign(draft, values, { name: values.name.trim() }),
              );
              brief.reset();
            } catch (cause) {
              setError(errorText(cause));
            }
          }}
        >
          <fieldset disabled={busy || engagement.archived} className="aw-stack">
            <legend className="aw-sr">Brief fields</legend>
            <div className="aw-grid">
              {(
                Object.entries(briefFields) as [
                  keyof typeof briefFields,
                  string,
                ][]
              ).map(([key, label]) => (
                <Field
                  key={key}
                  label={label}
                  value={brief.value[key]}
                  required={key === "name"}
                  multiline={["problem", "objectives", "constraints"].includes(
                    key,
                  )}
                  type={
                    key === "assessmentDate" || key === "decisionDeadline"
                      ? "date"
                      : "text"
                  }
                  onChange={(value) =>
                    brief.set({ ...brief.value, [key]: value })
                  }
                />
              ))}
              <Select
                label="Currency"
                value={brief.value.currency}
                onChange={(currency) =>
                  brief.set({
                    ...brief.value,
                    currency: currency as Currency,
                    acknowledged: false,
                  })
                }
              >
                {["USD", "GBP", "EUR"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </Select>
            </div>
            {brief.value.currency !== engagement.currency && (
              <label className="aw-check">
                <input
                  type="checkbox"
                  checked={brief.value.acknowledged}
                  onChange={(e) =>
                    brief.set({
                      ...brief.value,
                      acknowledged: e.target.checked,
                    })
                  }
                />
                I understand stored numbers are not converted when the currency
                label changes.
              </label>
            )}
            <div className="aw-actions">
              <button className="aw-primary" type="submit">
                Save brief
              </button>
              {brief.dirty && (
                <span className="aw-muted">
                  Unsaved draft · retained when switching records
                </span>
              )}
            </div>
          </fieldset>
        </form>
        <ErrorMessage error={error} />
      </section>
      <section className="aw-panel">
        <h2>Opportunities</h2>
        <form
          className="aw-inline-form"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              if (!add.value.trim()) throw new Error("Name the opportunity.");
              const next = createOpportunity(add.value.trim());
              await save("Added opportunity", (draft) => {
                draft.opportunities.push(next);
              });
              add.reset();
              props.navigate({ section: "brief", opportunityId: next.id });
            } catch (cause) {
              setError(errorText(cause));
            }
          }}
        >
          <Field
            label="New opportunity name"
            value={add.value}
            onChange={add.set}
            required
          />
          <button disabled={busy || engagement.archived}>
            Add opportunity
          </button>
        </form>
      </section>
      {opportunity && <OpportunityBrief {...props} opportunity={opportunity} />}
    </div>
  );
}

function OpportunityBrief({
  engagement,
  opportunity,
  save,
  busy,
  navigate,
  inspect,
}: SurfaceProps & { opportunity: NonNullable<SurfaceProps["opportunity"]> }) {
  const draft = useDraft(`discovery:${opportunity.id}`, {
    name: opportunity.name,
    problem: opportunity.problem,
    discovery: opportunity.discovery,
    processSteps: opportunity.processSteps,
  });
  const [error, setError] = useState("");
  const readiness = assessOpportunity(engagement, opportunity);
  return (
    <>
      <section className="aw-panel">
        <h2>Assessment readiness</h2>
        <div className="aw-readiness">
          {Object.entries(readiness.dimensions).map(([key, value]) => (
            <div key={key}>
              <span>{key}</span>
              <strong className={`aw-state-${value}`}>
                {value === "unknown" ? "Not assessed" : value}
              </strong>
            </div>
          ))}
        </div>
        <p>
          Owned assumptions support exploratory modelling. Accepted evidence is
          not proof or approval.
        </p>
        <div className="aw-actions">
          <button onClick={() => navigate({ section: "evidence" })}>
            Resolve evidence questions (
            {opportunity.requests.filter((x) => x.status === "open").length})
          </button>
          <button
            onClick={() =>
              inspect({
                title: "Readiness and history",
                content: (
                  <>
                    <p>{readiness.reasons.join(" ")}</p>
                    <ul>
                      {readiness.blockers.map((b, i) => (
                        <li key={i}>{b.message}</li>
                      ))}
                    </ul>
                    <h3>Engagement history</h3>
                    <ol>
                      {engagement.history
                        .slice()
                        .reverse()
                        .map((h) => (
                          <li key={h.id}>
                            {h.detail} · revision {h.revision}
                          </li>
                        ))}
                    </ol>
                  </>
                ),
              })
            }
          >
            Inspect readiness
          </button>
        </div>
      </section>
      <section className="aw-panel">
        <h2>Discovery and process</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              if (!draft.value.name.trim())
                throw new Error("Name the opportunity.");
              await save("Updated discovery and process", (next) => {
                const o = next.opportunities.find(
                  (x) => x.id === opportunity.id,
                )!;
                Object.assign(o, draft.value);
              });
              draft.reset();
              setError("");
            } catch (cause) {
              setError(errorText(cause));
            }
          }}
        >
          <fieldset disabled={busy || engagement.archived} className="aw-stack">
            <legend className="aw-sr">Discovery fields</legend>
            <Field
              label="Opportunity name"
              value={draft.value.name}
              onChange={(name) => draft.set({ ...draft.value, name })}
              required
            />
            <Field
              label="Opportunity problem"
              value={draft.value.problem}
              multiline
              onChange={(problem) => draft.set({ ...draft.value, problem })}
            />
            <div className="aw-grid">
              {(
                Object.keys(
                  draft.value.discovery,
                ) as (keyof typeof opportunity.discovery)[]
              ).map((category) => (
                <Field
                  key={category}
                  label={`${category[0].toUpperCase()}${category.slice(1)} discovery notes`}
                  multiline
                  value={draft.value.discovery[category].notes}
                  onChange={(notes) =>
                    draft.set({
                      ...draft.value,
                      discovery: {
                        ...draft.value.discovery,
                        [category]: { notes },
                      },
                    })
                  }
                />
              ))}
            </div>
            <ProcessEditor
              steps={draft.value.processSteps}
              change={(processSteps) =>
                draft.set({ ...draft.value, processSteps })
              }
            />
            <div className="aw-actions">
              <button className="aw-primary">Save discovery and process</button>
              {draft.dirty && <span>Unsaved draft</span>}
            </div>
          </fieldset>
        </form>
        <ErrorMessage error={error} />
      </section>
    </>
  );
}
