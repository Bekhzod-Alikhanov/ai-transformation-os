import type { SolutionOption, TaskRow } from "../types";
import { newId } from "../model";
import { taskEffort } from "../tasks";
import { formatMetric } from "./financial-results";
import { Field, Select } from "./fields";
const columns = {
  annualVolume: "Annual executions",
  currentMinutes: "Current human minutes",
  eligible: "Eligible (%)",
  remainingMinutes: "Remaining human minutes",
  reviewMinutes: "Human review minutes",
  exceptionRate: "Exceptions (%)",
  exceptionMinutes: "Exception handling minutes",
} as const;
export function TaskEditor({
  value,
  onChange,
}: {
  value: SolutionOption;
  onChange: (x: SolutionOption) => void;
}) {
  if (!value.taskPlan)
    return (
      <section className="aw-callout">
        <h3>Legacy aggregate model</h3>
        <p>
          Existing calculations are preserved. Explicit conversion creates one
          illustrative task from the current aggregate inputs; review it before
          saving.
        </p>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...value,
              taskPlan: {
                rows: [
                  {
                    id: newId(),
                    name: "Aggregate activity — review and split",
                    annualVolume: value.inputs.annualVolume,
                    currentMinutes: value.inputs.minutesBefore,
                    eligible: value.kind === "bau" ? 0 : 1,
                    responsibility:
                      value.kind === "bau"
                        ? "human"
                        : value.kind === "rules"
                          ? "automation"
                          : "agent",
                    remainingMinutes:
                      value.inputs.minutesBefore === null ||
                      value.inputs.reduction === null
                        ? null
                        : value.inputs.minutesBefore *
                          (1 - value.inputs.reduction),
                    reviewMinutes: value.inputs.reviewMinutes,
                    exceptionRate: 0,
                    exceptionMinutes: 0,
                    evidenceIds: [],
                    assumed: true,
                  },
                ],
              },
            })
          }
        >
          Convert explicitly to task model
        </button>
      </section>
    );
  const rows = value.taskPlan.rows,
    effort = taskEffort(
      rows,
      value.inputs.adoption,
      value.taskPlan.referenceReduction
        ? (value.inputs.reduction ?? 0) / value.taskPlan.referenceReduction
        : 1,
    );
  const update = (id: string, patch: Partial<TaskRow>) =>
    onChange({
      ...value,
      taskPlan: {
        ...value.taskPlan!,
        rows: rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      },
    });
  return (
    <section className="aw-stack">
      <h3>Task-level human effort</h3>
      <p>
        Manual: {formatMetric(effort.baselineHours)} h/year · Future human:{" "}
        {formatMetric(effort.futureHours)} h/year · Released:{" "}
        {formatMetric(effort.releasedHours)} h/year. Negative released hours
        mean added work.
      </p>
      <p className="aw-muted">
        Task baseline edits are shared across options on save. Adoption and
        loaded rate are shared by all tasks within this option, not across
        interventions. Gross reduction is an explicit handling sensitivity
        factor relative to the entered task model; review and exceptions are not
        scaled.
      </p>
      <div
        className="aw-scroll"
        tabIndex={0}
        role="region"
        aria-label="Task assumptions"
      >
        <table className="aw-task-table">
          <caption>
            Human workload and control assumptions · working draft
          </caption>
          <thead>
            <tr>
              <th>Activity</th>
              <th>Responsibility</th>
              {Object.values(columns).map((x) => (
                <th key={x}>{x}</th>
              ))}
              <th>Source status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <Field
                    label={`Activity · ${r.name}`}
                    value={r.name}
                    onChange={(name) => update(r.id, { name })}
                  />
                </td>
                <td>
                  <Select
                    label={`Responsibility · ${r.name}`}
                    value={r.responsibility}
                    onChange={(s) =>
                      update(r.id, {
                        responsibility: s as TaskRow["responsibility"],
                      })
                    }
                  >
                    {["human", "automation", "agent"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </Select>
                </td>
                {(Object.keys(columns) as (keyof typeof columns)[]).map(
                  (key) => (
                    <td key={key}>
                      <Field
                        label={`${columns[key]} · ${r.name}`}
                        type="number"
                        value={
                          r[key] === null
                            ? null
                            : r[key]! *
                              (key === "eligible" || key === "exceptionRate"
                                ? 100
                                : 1)
                        }
                        onChange={(s) =>
                          update(r.id, {
                            [key]:
                              s === ""
                                ? null
                                : Number(s) /
                                  (key === "eligible" || key === "exceptionRate"
                                    ? 100
                                    : 1),
                          })
                        }
                      />
                    </td>
                  ),
                )}
                <td>{r.assumed ? "Explicit assumption" : "Evidence linked"}</td>
                <td>
                  <button
                    type="button"
                    disabled={rows.length === 1}
                    onClick={() =>
                      onChange({
                        ...value,
                        taskPlan: {
                          ...value.taskPlan!,
                          rows: rows.filter((x) => x.id !== r.id),
                        },
                      })
                    }
                  >
                    Remove {r.name}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() =>
          onChange({
            ...value,
            taskPlan: {
              ...value.taskPlan!,
              rows: [
                ...rows,
                {
                  id: newId(),
                  name: `Activity ${rows.length + 1}`,
                  annualVolume: value.inputs.annualVolume,
                  currentMinutes: null,
                  eligible: null,
                  responsibility: "human",
                  remainingMinutes: null,
                  reviewMinutes: null,
                  exceptionRate: null,
                  exceptionMinutes: null,
                  evidenceIds: [],
                  assumed: true,
                },
              ],
            },
          })
        }
      >
        Add baseline task
      </button>
      {!!effort.issues.length && (
        <p className="aw-callout">{effort.issues.join("; ")}</p>
      )}
    </section>
  );
}
