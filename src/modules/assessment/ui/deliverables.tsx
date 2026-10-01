import { useMemo, useRef, useState } from "react";
import type { Engagement, Opportunity, Workspace } from "../types";
import {
  prepareExport,
  investmentBrief,
  createSteeringPack,
  createAssessmentWorkbook,
  downloadArtifact,
} from "../exports";
import { STEERING_OUTLINE } from "../exports/slides";
import { provenance } from "../exports/brief";
import { ErrorMessage, errorText, Select } from "./fields";

export function Deliverables({
  engagement,
  opportunity,
  brand,
}: {
  engagement: Engagement;
  opportunity: Opportunity | null;
  brand: Workspace["brand"];
}) {
  const [snapshotId, setSnapshotId] = useState("");
  const [includeInternalNotes, setIncludeInternalNotes] = useState(false);
  const [running, setRunning] = useState("");
  const locked = useRef(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState("");
  const prepared = useMemo(() => {
    if (!opportunity) return { payload: null, error: "" };
    try {
      return {
        payload: prepareExport(engagement, opportunity.id, brand, {
          snapshotId: snapshotId || undefined,
          includeInternalNotes,
        }),
        error: "",
      };
    } catch (cause) {
      return { payload: null, error: errorText(cause) };
    }
  }, [engagement, opportunity, brand, snapshotId, includeInternalNotes]);
  const payload = prepared.payload;
  const brief = useMemo(
    () => (payload ? investmentBrief(payload) : ""),
    [payload],
  );
  async function download(format: "md" | "pptx" | "xlsx") {
    if (!payload || locked.current) return;
    locked.current = true;
    setRunning(format);
    setError("");
    setCompleted("");
    try {
      const blob =
        format === "md"
          ? new Blob([brief], { type: "text/markdown;charset=utf-8" })
          : format === "pptx"
            ? await createSteeringPack(payload)
            : await createAssessmentWorkbook(payload);
      const slug =
        (payload.opportunity || "opportunity")
          .normalize("NFKD")
          .replace(/[^a-z0-9]+/gi, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 55) || "opportunity";
      const basis = payload.snapshotId
        ? `snapshot-r${payload.sourceRevision}-${payload.snapshotId.slice(0, 8)}`
        : `draft-r${payload.sourceRevision}`;
      const filename = `assessment-${slug}-${basis}.${format}`;
      downloadArtifact(blob, filename);
      setCompleted(`Download prepared: ${filename}`);
    } catch (cause) {
      setError(
        `Could not create the ${format.toUpperCase()} file. ${errorText(cause)} Retry the download; if it persists, download the Markdown brief and a workspace backup before reloading.`,
      );
    } finally {
      locked.current = false;
      setRunning("");
    }
  }
  return (
    <div className="aw-stack">
      <div className="aw-section-heading">
        <div>
          <p className="aw-eyebrow">05 / Decision materials</p>
          <h1>Deliverables</h1>
        </div>
        <p>One saved basis. Three review formats.</p>
      </div>
      {!opportunity ? (
        <p className="aw-callout">
          Add an opportunity in Brief to prepare deliverables.
        </p>
      ) : (
        <>
          <section className="aw-panel aw-stack">
            <h2>Choose the decision record</h2>
            <p>
              Current draft uses saved base inputs only. Save edits in Brief,
              Evidence, Options or Recommendation before exporting. Temporary
              scenarios and unsaved editor values are excluded.
            </p>
            <fieldset className="aw-export-controls" disabled={!!running}>
              <Select
                label="Export basis"
                value={snapshotId}
                onChange={(value) => {
                  setSnapshotId(value);
                  setError("");
                  setCompleted("");
                }}
              >
                <option value="">Current draft / not reviewed</option>
                {[...opportunity.recommendations].reverse().map((s) => (
                  <option key={s.id} value={s.id}>
                    Reviewed snapshot · {s.at} · r{s.sourceRevision} ·{" "}
                    {s.outcome}
                  </option>
                ))}
              </Select>
              <label className="aw-check">
                <input
                  type="checkbox"
                  checked={includeInternalNotes}
                  onChange={(e) => {
                    setIncludeInternalNotes(e.target.checked);
                    setCompleted("");
                  }}
                />
                Include internal notes
              </label>
            </fieldset>
            <p className="aw-muted">
              Internal notes are excluded by default from previews, file
              contents and metadata. These review files are not recovery
              backups.
            </p>
            {payload && (
              <div className="aw-callout">
                <strong>{payload.status}</strong>
                <p>{provenance(payload)}</p>
                <p>
                  {payload.basis} · {payload.currency} ·{" "}
                  {payload.includeInternalNotes
                    ? "Internal notes included"
                    : "Internal notes excluded"}
                </p>
              </div>
            )}
            <ErrorMessage error={prepared.error || error} />
            <div className="aw-actions" aria-label="Download deliverables">
              <button
                disabled={!payload || !!running}
                onClick={() => download("md")}
              >
                Download Markdown
              </button>
              <button
                disabled={!payload || !!running}
                onClick={() => download("pptx")}
              >
                Download PowerPoint
              </button>
              <button
                disabled={!payload || !!running}
                onClick={() => download("xlsx")}
              >
                Download Excel
              </button>
            </div>
            <p role="status" aria-live="polite">
              {running
                ? `Preparing ${running.toUpperCase()} locally…`
                : completed}
            </p>
          </section>
          <section className="aw-panel aw-stack">
            <h2>Steering pack outline</h2>
            <p>
              Eight editable slides. Long records are summarized with visible
              references to the full review workbook.
            </p>
            <ol className="aw-export-outline">
              {STEERING_OUTLINE.map((title) => (
                <li key={title}>{title}</li>
              ))}
            </ol>
          </section>
          <section className="aw-panel aw-stack">
            <h2>Investment brief preview</h2>
            <p>
              The exact Markdown text used by the download, from the same
              prepared payload as the slides and workbook.
            </p>
            <pre
              className="aw-brief-preview"
              aria-label="Investment brief preview"
              role="region"
              tabIndex={0}
            >
              {brief}
            </pre>
          </section>
        </>
      )}
    </div>
  );
}
