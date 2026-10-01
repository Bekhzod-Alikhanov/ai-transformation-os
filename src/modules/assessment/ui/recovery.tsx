import { useEffect, useState } from "react";
import type { Workspace } from "../types";
import { parseBackup, serializeBackup } from "../repository";
import { migrateLegacy } from "../migration";
import {
  downloadBackup,
  ErrorMessage,
  errorText,
  Field,
  Select,
} from "./fields";
import { accents, safeAccent } from "./operations";
import { useDraft } from "./drafts";

export type CommitWorkspace = (
  update: (current: Workspace | null) => Workspace,
) => Promise<Workspace>;
export function BackupControls({
  workspace,
  commit,
  busy,
  onRestored,
}: {
  workspace: Workspace | null;
  commit: CommitWorkspace;
  busy: boolean;
  onRestored: () => void;
}) {
  const [preview, setPreview] = useState<Workspace | null>(null),
    [error, setError] = useState("");
  return (
    <details className="aw-backup">
      <summary>Workspace backup / restore</summary>
      <div className="aw-stack">
        <p>
          Full recovery backup — includes internal notes, legacy records and all
          engagements. This is not a sanitised client deliverable.
        </p>
        <div className="aw-actions">
          {workspace && (
            <button
              disabled={busy}
              onClick={() => downloadBackup(serializeBackup(workspace))}
            >
              Download workspace backup
            </button>
          )}
          <label className="aw-field">
            <span>Restore workspace backup</span>
            <input
              disabled={busy}
              type="file"
              accept=".json,application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setPreview(null);
                try {
                  if (file.size > 20 * 1024 * 1024)
                    throw new Error("Backup exceeds the 20 MiB safety limit.");
                  setPreview(parseBackup(await file.text()));
                  setError("");
                } catch (cause) {
                  setError(errorText(cause));
                }
              }}
            />
          </label>
        </div>
        {preview && (
          <div className="aw-callout">
            <h3>Validated backup preview</h3>
            <p>
              {preview.engagements.length} engagements · source revision{" "}
              {preview.revision} · brand {preview.brand.name}
            </p>
            <ul>
              {preview.engagements.map((e) => (
                <li key={e.id}>
                  {e.name} · {e.currency} · {e.opportunities.length}{" "}
                  opportunities
                </li>
              ))}
            </ul>
            <p>
              Restoring replaces this browser’s complete assessment workspace
              and discards its unsaved drafts. Download its backup first if you
              want to retain it.
            </p>
            <button
              disabled={busy}
              onClick={async () => {
                if (
                  !window.confirm(
                    "Replace the saved assessment workspace and discard unsaved drafts? Keep a workspace backup first.",
                  )
                )
                  return;
                try {
                  await commit(() => preview);
                  setPreview(null);
                  setError("");
                  onRestored();
                } catch (cause) {
                  setError(errorText(cause));
                }
              }}
            >
              Confirm workspace restore
            </button>
            <button onClick={() => setPreview(null)}>Cancel restore</button>
          </div>
        )}
        <ErrorMessage error={error} />
      </div>
    </details>
  );
}

export function LegacyMigration({
  commit,
  busy,
}: {
  commit: CommitWorkspace;
  busy: boolean;
}) {
  const [raw, setRaw] = useState<string | null>(null),
    [preview, setPreview] = useState<Workspace | null>(null),
    [backedUp, setBackedUp] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setRaw(localStorage.getItem("beck-delivery-workbench:v1"));
      } catch {
        setError(
          "Legacy browser storage is unavailable. Existing legacy records have not been changed.",
        );
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  if (!raw && !error) return null;
  return (
    <section className="aw-panel aw-stack">
      <h2>Legacy workspace found</h2>
      <p>
        Migration is optional and only available before creating a version 2
        workspace. Your original demo record stays unchanged.
      </p>
      {raw && (
        <>
          <button
            disabled={busy}
            onClick={() => {
              downloadBackup(raw, "legacy-workspace-raw-backup.json");
              setBackedUp(true);
            }}
          >
            Download legacy raw backup
          </button>
          <button
            disabled={!backedUp || busy}
            onClick={() => {
              try {
                setPreview(migrateLegacy(raw));
                setError("");
              } catch (cause) {
                setError(errorText(cause));
              }
            }}
          >
            Preview legacy migration
          </button>
          {preview && (
            <>
              <ul>
                {preview.engagements.map((e) => (
                  <li key={e.id}>
                    {e.name} · USD · {e.opportunities.length} opportunity
                  </li>
                ))}
              </ul>
              <p>
                Only saved alternative economics can be recovered. Other
                alternatives remain unknown. Legacy evidence and unmapped
                records remain labelled.
              </p>
              <details>
                <summary>Raw legacy record preview</summary>
                <pre>{raw}</pre>
              </details>
              <button
                disabled={busy}
                onClick={async () => {
                  try {
                    await commit((current) => {
                      if (current)
                        throw new Error(
                          "Migration cannot replace an existing version 2 workspace.",
                        );
                      return preview;
                    });
                  } catch (cause) {
                    setError(errorText(cause));
                  }
                }}
              >
                Import previewed legacy workspace
              </button>
            </>
          )}
        </>
      )}
      <ErrorMessage error={error} />
    </section>
  );
}

export function BrandSettings({
  workspace,
  busy,
  commit,
}: {
  workspace: Workspace;
  busy: boolean;
  commit: CommitWorkspace;
}) {
  const draft = useDraft("brand", {
    name: workspace.brand.name,
    accent: safeAccent(workspace.brand.accent),
  });
  const [error, setError] = useState("");
  return (
    <details className="aw-panel">
      <summary>Brand settings</summary>
      <form
        className="aw-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await commit((current) => ({
              ...current!,
              brand: {
                name: draft.value.name,
                accent: safeAccent(draft.value.accent),
              },
            }));
            draft.reset();
            setError("");
          } catch (cause) {
            setError(errorText(cause));
          }
        }}
      >
        <Field
          label="Brand name"
          value={draft.value.name}
          onChange={(name) => draft.set({ ...draft.value, name })}
        />
        <Select
          label="Brand accent"
          value={draft.value.accent}
          onChange={(accent) => draft.set({ ...draft.value, accent })}
        >
          {Object.entries(accents).map(([name, colour]) => (
            <option value={colour} key={name}>
              {name}
            </option>
          ))}
        </Select>
        <p>
          Contrast-safe colours for white work surfaces. Restored custom colours
          display as Cobalt.
        </p>
        <button disabled={busy}>Save brand</button>
        <ErrorMessage error={error} />
      </form>
    </details>
  );
}
