"use client";
import { useState, type CSSProperties } from "react";
import { reviseEngagement } from "./model";
import { createTemplate } from "./templates";
import type {
  SurfaceProps,
  NavigationTarget,
  InspectorContent,
  Section,
} from "./ui/surface";
import { DraftProvider, useDrafts } from "./ui/drafts";
import { useWorkspace } from "./ui/use-workspace";
import { WorkQueue } from "./ui/work-queue";
import { Brief } from "./ui/brief";
import { Evidence } from "./ui/evidence";
import { Options } from "./ui/options";
import { Recommendation } from "./ui/recommendation";
import { Deliverables } from "./ui/deliverables";
import { Cockpit } from "./ui/cockpit";
import { EvaluationSurface } from "./ui/evaluation";
import { Workshop } from "./ui/workshop";
import { Inspector } from "./ui/inspector";
import { BackupControls } from "./ui/recovery";
import { downloadBackup, ErrorMessage, errorText, Select } from "./ui/fields";
import { safeAccent } from "./ui/operations";
import "./ui/workbench.css";

export function AssessmentWorkbench({
  mode = "workbench",
}: {
  mode?: "workbench" | "demo";
}) {
  return (
    <DraftProvider>
      <Workbench mode={mode} />
    </DraftProvider>
  );
}
function Workbench({ mode }: { mode: "workbench" | "demo" }) {
  const store = useWorkspace(mode),
    drafts = useDrafts();
  const [engagementId, setEngagementId] = useState<string | null>(null),
    [opportunityIds, setOpportunityIds] = useState<Record<string, string>>({});
  const [home, setHome] = useState(mode !== "demo"),
    [section, setSection] = useState<Section>("overview"),
    [recordId, setRecordId] = useState<string>();
  const [inspector, setInspector] = useState<InspectorContent | null>(null),
    [inspectorOpen, setInspectorOpen] = useState(false),
    [localError, setLocalError] = useState("");
  const [returnFocus, setReturnFocus] = useState<HTMLElement | null>(null);
  const [restoration, setRestoration] = useState(0);
  function resetRestoredView() {
    drafts.clear();
    setRestoration((value) => value + 1);
    setLocalError("");
    setInspector(null);
    setInspectorOpen(false);
    setRecordId(undefined);
  }
  const workspace = store.workspace;
  const engagement =
    workspace?.engagements.find((e) => e.id === engagementId) ??
    workspace?.engagements.find((e) => !e.archived) ??
    workspace?.engagements[0] ??
    null;
  const opportunity =
    engagement?.opportunities.find(
      (o) => o.id === opportunityIds[engagement.id],
    ) ??
    engagement?.opportunities[0] ??
    null;
  function navigate(target: NavigationTarget) {
    const eid = target.engagementId ?? engagement?.id;
    if (eid) setEngagementId(eid);
    if (eid && target.opportunityId)
      setOpportunityIds((ids) => ({ ...ids, [eid]: target.opportunityId! }));
    setSection(target.section);
    setRecordId(target.recordId);
    setHome(false);
    setInspector(null);
    setInspectorOpen(false);
  }
  const inspect: SurfaceProps["inspect"] = (value) => {
    setReturnFocus(document.activeElement as HTMLElement);
    setInspector(value);
    setInspectorOpen(true);
  };
  const save: SurfaceProps["save"] = async (detail, update) => {
    const id = engagement!.id;
    const saved = await store.commit((current) => {
      if (!current) throw new Error("Create a workspace first.");
      const selected = current.engagements.find((e) => e.id === id);
      if (!selected) throw new Error("Engagement no longer exists.");
      if (selected.archived)
        throw new Error("Restore this engagement before editing.");
      return {
        ...current,
        engagements: current.engagements.map((e) =>
          e.id === id ? reviseEngagement(e, detail, update) : e,
        ),
      };
    });
    // Inspector content is a point-in-time snapshot; do not leave it beside a
    // newer committed record. Failed saves retain both context and drafts.
    setInspector(null);
    setInspectorOpen(false);
    return saved.engagements.find((e) => e.id === id)!;
  };
  const surfaces = engagement
    ? {
        engagement,
        opportunity,
        save,
        busy: store.busy,
        navigate,
        inspect,
        recordId,
      }
    : null;
  return (
    <div
      className="aw-shell"
      style={
        {
          "--aw-accent": safeAccent(workspace?.brand.accent ?? ""),
        } as CSSProperties
      }
      data-assessment-ready={!store.opening && !store.rawBackup}
    >
      <a className="aw-skip" href="#assessment-content">
        Skip to assessment
      </a>
      <header className="aw-header">
        <div className="aw-brand">
          <span className="aw-monogram">A</span>
          <div>
            <strong>{workspace?.brand.name || "Assessment"}</strong>
            <small>CONSULTING WORKBENCH</small>
          </div>
        </div>
        <p className="aw-local">Local only · synthetic data only</p>
        <a href={mode === "demo" ? "/workbench" : "/demo"}>
          {mode === "demo" ? "My saved assessments" : "Open synthetic examples"}
        </a>
        {!store.opening && !store.rawBackup && !(store.error && !workspace) && (
          <BackupControls
            key={restoration}
            workspace={workspace}
            commit={store.commit}
            busy={store.busy}
            onRestored={resetRestoredView}
          />
        )}
      </header>
      <div className="aw-warning">
        {mode === "demo"
          ? "Synthetic demonstrator"
          : "Local assessment prototype"}{" "}
        · no real client data, live AI or provider connections. Beck’s
        investment decision & delivery workbench.
      </div>
      <div className="aw-toolbar">
        <button onClick={() => setHome(true)}>Work queue</button>
        {workspace && (
          <Select
            label="Engagement"
            value={engagement?.id ?? ""}
            onChange={(id) =>
              navigate({ section: "overview", engagementId: id })
            }
          >
            {workspace.engagements.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
                {e.archived ? " (archived)" : ""}
              </option>
            ))}
          </Select>
        )}
        {engagement && (
          <Select
            label="Opportunity"
            value={opportunity?.id ?? ""}
            onChange={(id) => navigate({ section, opportunityId: id })}
          >
            {!engagement.opportunities.length && (
              <option value="">No opportunities yet</option>
            )}
            {engagement.opportunities.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        )}
        <p role="status">
          {store.opening
            ? "Opening browser storage…"
            : store.busy
              ? "Saving…"
              : store.notice || "Local record ready"}
        </p>
        {drafts.dirty && <span className="aw-tag">Unsaved drafts</span>}
        {surfaces && (
          <button onClick={() => navigate({ section: "brief" })}>
            Edit engagement brief
          </button>
        )}
        {surfaces && (
          <button onClick={() => navigate({ section: "deliverables" })}>
            Client deliverables
          </button>
        )}
        {engagement && (
          <button
            onClick={() =>
              inspect({
                title: "Engagement history",
                content: (
                  <ol>
                    {engagement.history
                      .slice()
                      .reverse()
                      .map((h) => (
                        <li key={h.id}>
                          {h.detail} · r{h.revision} · {h.at}
                        </li>
                      ))}
                  </ol>
                ),
              })
            }
          >
            History
          </button>
        )}
        {mode === "demo" && (
          <button
            disabled={store.busy}
            onClick={async () => {
              if (
                !window.confirm(
                  "Reset only the synthetic demonstration? Saved workbench assessments are not affected. Back up demo changes first if needed.",
                )
              )
                return;
              try {
                await store.commit(() => ({
                  ...workspace!,
                  engagements: [
                    createTemplate("support"),
                    createTemplate("reporting"),
                  ],
                }));
                resetRestoredView();
                setEngagementId(null);
                setHome(false);
                setSection("overview");
              } catch (cause) {
                setLocalError(errorText(cause));
              }
            }}
          >
            Reset demo
          </button>
        )}
      </div>
      <ErrorMessage error={store.error || localError} />
      {store.stale && (
        <div className="aw-callout">
          <p>
            Another tab committed changes. Your unsaved drafts are retained.
            Reloading discards all unsaved drafts; the saved record is never
            automatically overwritten.
          </p>
          <button
            disabled={store.busy}
            onClick={async () => {
              if (
                !window.confirm(
                  "Reload the persisted workspace and discard every unsaved draft in this tab?",
                )
              )
                return;
              try {
                await store.reload();
                resetRestoredView();
              } catch (cause) {
                setLocalError(errorText(cause));
              }
            }}
          >
            Reload saved workspace
          </button>
        </div>
      )}
      {store.opening ? (
        <main id="assessment-content" className="aw-main">
          <h1>Opening assessment workspace</h1>
          <p>Checking browser storage before offering creation or migration.</p>
        </main>
      ) : store.error && !workspace ? (
        <main id="assessment-content" className="aw-main">
          <h1>Workspace recovery required</h1>
          <p>No saved record was reset or replaced.</p>
          {store.rawBackup ? (
            <>
              <button
                onClick={() =>
                  downloadBackup(
                    store.rawBackup!,
                    "assessment-corrupt-raw-record.json",
                  )
                }
              >
                Download untouched raw record
              </button>
              <p>
                This raw corrupt record is for diagnosis, not a validated
                backup. To resume, restore a previously validated workspace
                backup in a clean browser profile, preserving this original
                record.
              </p>
            </>
          ) : (
            <p>
              Check site storage permissions and close older workbench tabs,
              then reopen this page to reconnect.
            </p>
          )}
        </main>
      ) : (
        <div className="aw-layout">
          <nav className="aw-nav" aria-label="Assessment sections">
            <p className="aw-eyebrow">Assessment</p>
            {surfaces && !home ? (
              (
                [
                  ["overview", "Decision Overview"],
                  ["evidence", "Process & Evidence"],
                  ["options", "Investment Comparison"],
                  ["evaluation", "Agent & Evaluation"],
                  ["recommendation", "Pilot & Recommendation"],
                ] as const
              ).map(([id, name], i) => (
                <button
                  key={id}
                  aria-label={name}
                  aria-current={section === id ? "page" : undefined}
                  onClick={() => navigate({ section: id })}
                >
                  <span>0{i + 1}</span>
                  {name}
                </button>
              ))
            ) : (
              <p>Create or open an engagement to begin.</p>
            )}
            <p className="aw-muted">Evidence before commitment.</p>
          </nav>
          <main
            key={restoration}
            id="assessment-content"
            className="aw-main"
            tabIndex={-1}
          >
            {workspace?.migration.legacyImported &&
              !workspace.migration.confirmed && (
                <div className="aw-callout">
                  <p>
                    Legacy migration is saved. Review the imported evidence and
                    unknown alternatives; the original demo remains intact.
                  </p>
                  <button
                    disabled={store.busy}
                    onClick={async () => {
                      try {
                        await store.commit((current) => ({
                          ...current!,
                          migration: { ...current!.migration, confirmed: true },
                        }));
                      } catch (cause) {
                        setLocalError(errorText(cause));
                      }
                    }}
                  >
                    Confirm migration reviewed
                  </button>
                </div>
              )}
            {engagement?.archived && !home && (
              <p className="aw-callout">
                Archived engagement · restore it from the work queue to edit.
              </p>
            )}
            {!surfaces || home ? (
              <WorkQueue
                workspace={workspace}
                commit={store.commit}
                busy={store.busy}
                navigate={navigate}
              />
            ) : section === "overview" ? (
              <Cockpit {...surfaces} />
            ) : section === "brief" ? (
              <Brief {...surfaces} />
            ) : section === "options" ? (
              <Options key={opportunity?.id} {...surfaces} />
            ) : section === "recommendation" ? (
              <Recommendation {...surfaces} />
            ) : section === "deliverables" ? (
              <Deliverables
                key={opportunity?.id}
                engagement={engagement!}
                opportunity={opportunity}
                brand={workspace!.brand}
              />
            ) : section === "evaluation" ? (
              <EvaluationSurface {...surfaces} />
            ) : (
              <div className="aw-stack">
                <Workshop {...surfaces} />
                <Evidence
                  key={`${opportunity?.id}:${recordId ?? ""}`}
                  {...surfaces}
                />
                <details className="aw-panel">
                  <summary>Engagement brief & process editor</summary>
                  <Brief {...surfaces} />
                </details>
              </div>
            )}
          </main>
          <Inspector
            value={inspector}
            open={inspectorOpen}
            close={() => setInspectorOpen(false)}
            returnFocus={returnFocus}
          />
        </div>
      )}
    </div>
  );
}
