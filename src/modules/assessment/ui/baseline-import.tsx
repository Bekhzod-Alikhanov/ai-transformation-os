import { useRef, useState } from "react";
import {
  readBaselineFile,
  previewBaseline,
  type ImportTable,
  type BaselineMapping,
} from "../imports";
import { useDraft } from "./drafts";
import { applyBaseline } from "./operations";
import { Field, Select, ErrorMessage, errorText } from "./fields";
import type { SurfaceProps } from "./surface";

type ImportDraft = {
  file: File | null;
  table: ImportTable | null;
  mapping: BaselineMapping;
  owner: string;
};
export function BaselineImport({
  opportunity,
  engagement,
  save,
  busy,
}: SurfaceProps) {
  const draft = useDraft<ImportDraft>(`import:${opportunity!.id}`, {
    file: null,
    table: null,
    mapping: {
      volumeColumn: "",
      minutesColumn: "",
      period: "annual",
      timeUnit: "minutes",
    },
    owner: "",
  });
  const { file, table, mapping, owner } = draft.value;
  const [error, setError] = useState(""),
    [reading, setReading] = useState(false);
  const request = useRef(0);
  const preview = table ? previewBaseline(table, mapping) : null;
  async function read(input: File, sheet?: string) {
    const token = ++request.current;
    setReading(true);
    setError("");
    draft.set({ ...draft.value, file: input, table: null });
    try {
      const parsed = await readBaselineFile(input, sheet);
      if (token === request.current)
        draft.set({ ...draft.value, file: input, table: parsed });
    } catch (cause) {
      if (token === request.current) setError(errorText(cause));
    } finally {
      if (token === request.current) setReading(false);
    }
  }
  return (
    <section className="aw-panel aw-stack">
      <div>
        <p className="aw-eyebrow">Baseline intake</p>
        <h2>Review a local file</h2>
        <p>
          CSV or XLSX · file bytes stay in this browser. Preview first; applying
          updates the shared baseline for every option.
        </p>
      </div>
      <fieldset
        disabled={busy || reading || engagement.archived}
        className="aw-stack"
      >
        <legend className="aw-sr">Baseline import controls</legend>
        <div
          className="aw-drop"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const dropped = e.dataTransfer.files[0];
            if (dropped && !busy && !reading && !engagement.archived)
              void read(dropped);
          }}
        >
          <label className="aw-field">
            <span>Baseline file</span>
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => {
                const input = e.target.files?.[0];
                if (input) void read(input);
                e.target.value = "";
              }}
            />
          </label>
          <p className="aw-muted">
            Choose or drop a synthetic file · up to 10 MiB, 5,000 rows
          </p>
        </div>
        {table && (
          <>
            <div className="aw-grid">
              {table.availableSheets.length > 0 && (
                <Select
                  label="Workbook sheet"
                  value={table.sheetName ?? ""}
                  onChange={(sheet) => {
                    if (file) void read(file, sheet);
                  }}
                >
                  {table.availableSheets.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              )}
              {(["volumeColumn", "minutesColumn"] as const).map((key) => (
                <Select
                  key={key}
                  label={
                    key === "volumeColumn" ? "Volume column" : "Time column"
                  }
                  value={mapping[key]}
                  onChange={(value) =>
                    draft.set({
                      ...draft.value,
                      mapping: { ...mapping, [key]: value },
                    })
                  }
                >
                  <option value="">Choose a column</option>
                  {table.headers.map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </Select>
              ))}
              <Select
                label="Observation period"
                value={mapping.period}
                onChange={(value) =>
                  draft.set({
                    ...draft.value,
                    mapping: {
                      ...mapping,
                      period: value as BaselineMapping["period"],
                    },
                  })
                }
              >
                {["annual", "monthly", "weekly"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </Select>
              <Select
                label="Time unit"
                value={mapping.timeUnit}
                onChange={(value) =>
                  draft.set({
                    ...draft.value,
                    mapping: {
                      ...mapping,
                      timeUnit: value as BaselineMapping["timeUnit"],
                    },
                  })
                }
              >
                {["minutes", "seconds", "hours"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </Select>
              <Field
                label="Baseline owner"
                value={owner}
                onChange={(owner) => draft.set({ ...draft.value, owner })}
              />
            </div>
            <div
              className="aw-scroll"
              role="region"
              aria-label="Baseline source preview"
              tabIndex={0}
            >
              <table>
                <caption>
                  {table.sourceName}
                  {table.sheetName ? ` · ${table.sheetName}` : ""} · first{" "}
                  {Math.min(8, table.rows.length)} rows
                </caption>
                <thead>
                  <tr>
                    <th>Source row</th>
                    {table.headers.map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.slice(0, 8).map((row, i) => (
                    <tr key={table.rowNumbers[i]}>
                      <th>{table.rowNumbers[i]}</th>
                      {row.map((value, j) => (
                        <td key={j}>{String(value ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {preview && (
          <div className="aw-callout">
            <h3>Import preview</h3>
            {preview.valid ? (
              <>
                <strong>
                  {preview.annualVolume} items/year · {preview.minutesBefore}{" "}
                  minutes/item
                </strong>
                <p>{preview.assumptionsSummary}</p>
                <p>{preview.sourceLocator}</p>
                <p>
                  Provenance: user provided · confidence: low, pending review.
                  This does not establish accepted evidence.
                </p>
              </>
            ) : (
              <ul>
                {preview.errors.map((error, i) => (
                  <li key={i}>
                    Row {error.row}: {error.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <button
          className="aw-primary"
          disabled={!preview?.valid || !owner.trim()}
          onClick={async () => {
            try {
              if (!preview || !table || !opportunity) return;
              await save("Applied reviewed baseline import", (next) => {
                const i = next.opportunities.findIndex(
                  (o) => o.id === opportunity.id,
                );
                next.opportunities[i] = applyBaseline(
                  next.opportunities[i],
                  preview,
                  table.sourceName,
                  owner,
                );
              });
              draft.reset();
              setError("");
            } catch (cause) {
              setError(errorText(cause));
            }
          }}
        >
          Apply baseline to all options
        </button>
      </fieldset>
      {reading && <p>Reading file locally…</p>}
      <ErrorMessage error={error} />
    </section>
  );
}
