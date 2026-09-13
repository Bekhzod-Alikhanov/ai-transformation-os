"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCheck,
  FileCheck2,
  Gauge,
  Layers3,
  ListChecks,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { BusinessCase, Metric } from "./business-case";
import { GuidedTour } from "./guided-tour";
import { tourSteps, type TourLanguage } from "./tour-steps";
import {
  DeliveryPanel,
  EvidencePanel,
  OutcomesPanel,
  SolutionPanel,
} from "./panels";
import { calculateEconomics } from "./economics";
import {
  compact,
  decisionBrief,
  downloadFile,
  exportSteeringPack,
  number,
  percent,
} from "./exports";
import {
  assessProject,
  recordDecision,
  restoreWorkspace,
  reviseProject,
  seedWorkspace,
  STORAGE_KEY,
  type DecisionInput,
  type Project,
  type ProjectId,
  type Workspace,
} from "./model";
import "./workbench.css";

const sections = [
  { name: "Engagement brief", icon: BriefcaseBusiness },
  { name: "Evidence", icon: FileCheck2 },
  { name: "Business case", icon: Gauge },
  { name: "Solution & evaluation", icon: Layers3 },
  { name: "Delivery plan", icon: ListChecks },
  { name: "Outcomes & decision", icon: ShieldCheck },
] as const;

export function DeliveryWorkbench() {
  const [workspace, setWorkspace] = useState<Workspace>(seedWorkspace);
  const [ready, setReady] = useState(false);
  const [projectId, setProjectId] = useState<ProjectId>("support");
  const [section, setSection] = useState(0);
  const [sponsor, setSponsor] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [corrupt, setCorrupt] = useState(false);
  const [restoration, setRestoration] = useState(0);
  const [tourIndex, setTourIndex] = useState<number | null>(null);
  const [tourPaused, setTourPaused] = useState(false);
  const [tourLanguage, setTourLanguage] = useState<TourLanguage>("ru");
  const tourTrigger = useRef<HTMLButtonElement>(null);
  const latest = useRef(workspace);
  const resetTrigger = useRef<HTMLButtonElement>(null);
  const project = workspace.projects.find((p) => p.id === projectId)!;

  useEffect(() => {
    const hydrate = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const restored = restoreWorkspace(raw);
          latest.current = restored;
          setWorkspace(restored);
        }
      } catch {
        setCorrupt(true);
        setError(
          "Saved data could not be loaded. It has not been overwritten. Download a backup, then restore a valid file or reset this demo.",
        );
      }
      setReady(true);
    }, 0);
    function sync(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;
      try {
        const restored = event.newValue
          ? restoreWorkspace(event.newValue)
          : seedWorkspace();
        latest.current = restored;
        setWorkspace(restored);
        setNotice("Workspace updated from another tab.");
        setRestoration((value) => value + 1);
        setCorrupt(false);
      } catch {
        setError(
          "Another tab saved unreadable data; your current view is preserved.",
        );
        setCorrupt(true);
      }
    }
    window.addEventListener("storage", sync);
    return () => {
      window.clearTimeout(hydrate);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function commit(next: Workspace, allowRecovery = false) {
    if (!ready || (corrupt && !allowRecovery)) {
      setError("Restore or reset the unreadable workspace before editing.");
      throw new Error("Workspace recovery required.");
    }
    try {
      // Save before displaying success: a quota failure never becomes a silently lost edit.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      latest.current = next;
      setWorkspace(next);
      if (allowRecovery) setRestoration((value) => value + 1);
      setCorrupt(false);
      setError("");
      setNotice("Saved in this browser · " + new Date().toLocaleTimeString());
    } catch {
      setError(
        "This browser could not save the change. Free storage or enable site storage, then try again. Your previous record is unchanged.",
      );
      throw new Error("Local save failed.");
    }
  }
  function change(detail: string, update: (p: Project) => void) {
    const base = latest.current;
    const current = base.projects.find((p) => p.id === projectId)!;
    commit({
      ...base,
      projects: base.projects.map((p) =>
        p.id === projectId ? reviseProject(current, detail, update) : p,
      ),
    });
  }
  function decide(input: DecisionInput) {
    const base = latest.current;
    commit({
      ...base,
      projects: base.projects.map((p) =>
        p.id === projectId ? recordDecision(p, input) : p,
      ),
    });
  }
  function backup() {
    try {
      downloadFile(
        "beck-workspace-backup.json",
        localStorage.getItem(STORAGE_KEY) ?? JSON.stringify(workspace),
        "application/json",
      );
    } catch {
      setError(
        "Could not read browser storage. Use the decision brief to download the displayed project.",
      );
    }
  }
  function navigate(index: number) {
    if (tourIndex !== null) setTourPaused(true);
    setSection(index);
    setSponsor(false);
  }
  function moveTour(index: number) {
    const step = tourSteps[index];
    if (!step) return;
    setTourIndex(index);
    setTourPaused(false);
    setProjectId(step.project);
    setSection(step.section);
    setSponsor(false);
  }
  function closeTour() {
    setTourIndex(null);
    setTourPaused(false);
    tourTrigger.current?.focus();
  }
  const gate = assessProject(project);

  return (
    <div
      className={"dw-shell" + (tourIndex !== null ? " dw-tour-active" : "")}
      data-replay-ready={ready}
    >
      <a href="#engagement-content" className="dw-skip">
        Skip to engagement content
      </a>
      <aside className="dw-sidebar">
        <div className="dw-brand">
          <span className="dw-brand-icon">
            <Layers3 size={23} />
          </span>
          <div>
            AI Transformation<span>DELIVERY WORKBENCH</span>
          </div>
        </div>
        <div className="dw-sidebar-label">
          CLIENT ENGAGEMENTS <span>02</span>
        </div>
        <nav aria-label="Client engagements" className="dw-projects">
          {workspace.projects.map((p, i) => (
            <button
              key={p.id}
              aria-pressed={p.id === projectId}
              className={p.id === projectId ? "active" : ""}
              onClick={() => {
                if (tourIndex !== null) setTourPaused(true);
                setProjectId(p.id);
                setSection(0);
                setNotice("");
              }}
            >
              <span>0{i + 1}</span>
              <div>
                {p.id === "support"
                  ? "Support operations"
                  : "Executive reporting"}
                <small>
                  {p.id === "support"
                    ? "Service transformation"
                    : "Management intelligence"}
                </small>
              </div>
            </button>
          ))}
        </nav>
        <div className="dw-sidebar-label">ENGAGEMENT WORKSPACE</div>
        <nav aria-label="Engagement workspace" className="dw-navigation">
          {sections.map((item, i) => (
            <button
              key={item.name}
              className={!sponsor && section === i ? "active" : ""}
              aria-current={!sponsor && section === i ? "page" : undefined}
              onClick={() => navigate(i)}
            >
              <item.icon size={17} />
              <span>{item.name}</span>
            </button>
          ))}
        </nav>
        <div className="dw-sidebar-bottom">
          <div className="dw-avatar">B</div>
          <div>
            <strong>Beck</strong>
            <small>AI delivery lead · independent demo</small>
          </div>
        </div>
      </aside>
      <div className="dw-body">
        <header className="dw-topbar">
          <div>
            <span className="dw-live-dot" />
            Synthetic client engagement{" "}
            <span className="dw-topbar-divider">/</span> Browser-local workspace
          </div>
          <div className="dw-toggle" aria-label="Presentation view">
            <button
              aria-pressed={!sponsor}
              onClick={() => {
                if (tourIndex !== null) setTourPaused(true);
                setSponsor(false);
              }}
            >
              Delivery view
            </button>
            <button
              aria-pressed={sponsor}
              onClick={() => {
                if (tourIndex !== null) setTourPaused(true);
                setSponsor(true);
              }}
            >
              Sponsor view
            </button>
          </div>
          <button
            ref={tourTrigger}
            className="dw-btn dw-tour-launch"
            disabled={!ready}
            onClick={() => moveTour(tourIndex ?? 0)}
            aria-label="Start guided tour / Начать тур"
          >
            {tourIndex === null
              ? "Start guided tour · Начать тур"
              : "Continue tour · Продолжить"}
          </button>
        </header>
        <main id="engagement-content" className="dw-main" tabIndex={-1}>
          <div className="dw-project-heading">
            <div>
              <p className="dw-eyebrow">
                ASTER FINANCIAL GROUP / ENGAGEMENT{" "}
                {project.id === "support" ? "01" : "02"}
              </p>
              <h1>{project.name}</h1>
              <p>{project.summary}</p>
            </div>
            <span
              className={
                "dw-gate " +
                (gate.recommendation === "Stop" ||
                gate.recommendation === "Pause"
                  ? "red"
                  : "")
              }
            >
              {gate.recommendation}
              <small>Current policy recommendation</small>
            </span>
          </div>
          <div className="dw-toolbar">
            <span>
              <CheckCheck size={15} />
              {ready ? "Local record" : "Loading record…"} · revision{" "}
              {project.revision}
            </span>
            <div className="dw-actions">
              <button
                className="dw-btn"
                onClick={() =>
                  downloadFile(
                    project.id + "-decision-brief.md",
                    decisionBrief(project),
                  )
                }
              >
                Decision brief
              </button>
              <button
                className="dw-btn"
                disabled={exporting}
                onClick={async () => {
                  setExporting(true);
                  try {
                    await exportSteeringPack(structuredClone(project));
                    setNotice(
                      "Editable steering pack downloaded from the current project snapshot.",
                    );
                  } catch {
                    setError(
                      "The steering pack could not be generated. Try again or download the decision brief.",
                    );
                  } finally {
                    setExporting(false);
                  }
                }}
              >
                {exporting ? "Preparing pack…" : "Export steering pack"}
              </button>
            </div>
          </div>
          {error ? (
            <div className="dw-error" role="alert">
              {error}
            </div>
          ) : null}
          <p className="dw-save-status" role="status">
            {notice ||
              "Synthetic sources and sample outputs. No live AI, external actions, or confidential client data."}
          </p>
          <fieldset
            className="dw-content-fieldset"
            disabled={!ready || corrupt}
          >
            <legend className="dw-visually-hidden">Engagement controls</legend>
            {sponsor || section === 0 ? (
              <Overview
                project={project}
                sponsor={sponsor}
                navigate={navigate}
              />
            ) : null}
            {!sponsor && section === 1 ? (
              <EvidencePanel
                key={project.id + restoration}
                project={project}
                change={change}
              />
            ) : null}
            {!sponsor && section === 2 ? (
              <BusinessCase
                key={project.id + project.option + restoration}
                project={project}
                change={change}
              />
            ) : null}
            {!sponsor && section === 3 ? (
              <SolutionPanel
                key={project.id + restoration}
                project={project}
                change={change}
              />
            ) : null}
            {!sponsor && section === 4 ? (
              <DeliveryPanel
                key={project.id + restoration}
                project={project}
                change={change}
              />
            ) : null}
            {!sponsor && section === 5 ? (
              <OutcomesPanel
                key={project.id + restoration}
                project={project}
                change={change}
                decide={decide}
              />
            ) : null}
          </fieldset>
          <details className="dw-panel dw-details dw-history">
            <summary>
              Engagement history{" "}
              <span>{project.history.length} recorded events</span>
            </summary>
            <ol>
              {project.history
                .slice()
                .reverse()
                .map((item) => (
                  <li key={item.id}>
                    <span>r{item.revision}</span>
                    <div>
                      <strong>{item.detail}</strong>
                      <small>{new Date(item.at).toLocaleString()}</small>
                    </div>
                  </li>
                ))}
            </ol>
          </details>
          <footer className="dw-footer">
            <div>
              <strong>Your rehearsal stays in this browser.</strong>
              <p>
                Back up before switching devices or clearing storage. This is an
                independent demonstration, not a Sia product or a live client
                engagement.
              </p>
            </div>
            <div className="dw-actions">
              <button className="dw-btn" onClick={backup}>
                Back up workspace
              </button>
              <label className="dw-btn">
                Restore backup
                <input
                  className="dw-visually-hidden"
                  type="file"
                  accept=".json,application/json"
                  aria-label="Restore workspace backup"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    try {
                      if (file.size > 5000000)
                        throw new Error("Backup exceeds 5 MB.");
                      const restored = restoreWorkspace(await file.text());
                      commit(restored, true);
                      setNotice("Validated workspace backup restored.");
                    } catch {
                      setError(
                        "Could not restore this file. Choose a valid two-project workspace backup, under 5 MB. Existing data is unchanged.",
                      );
                    }
                    event.target.value = "";
                  }}
                />
              </label>
              <button
                ref={resetTrigger}
                className="dw-btn"
                onClick={() => setResetOpen(true)}
              >
                <RotateCcw size={14} />
                Reset demo
              </button>
            </div>
          </footer>
        </main>
      </div>
      {tourIndex !== null ? (
        <GuidedTour
          index={tourIndex}
          paused={tourPaused}
          language={tourLanguage}
          onMove={moveTour}
          onPause={() => setTourPaused(true)}
          onResume={() => moveTour(tourIndex)}
          onClose={closeTour}
          onLanguage={setTourLanguage}
        />
      ) : null}
      <Dialog.Root open={resetOpen} onOpenChange={setResetOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dw-dialog-overlay" />
          <Dialog.Content
            className="dw-dialog"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              resetTrigger.current?.focus();
            }}
          >
            <Dialog.Title>Reset both demo engagements?</Dialog.Title>
            <Dialog.Description>
              This removes local changes, reviews and decisions from this demo.
              Other application data is untouched. Download a backup first if
              you want to keep your rehearsal.
            </Dialog.Description>
            <div className="dw-actions">
              <button className="dw-btn" onClick={backup}>
                Download backup
              </button>
              <Dialog.Close className="dw-btn">Cancel</Dialog.Close>
              <button
                className="dw-btn danger"
                onClick={() => {
                  try {
                    commit(seedWorkspace(), true);
                    setProjectId("support");
                    setSection(0);
                    setSponsor(false);
                    setTourIndex(null);
                    setResetOpen(false);
                    setNotice(
                      "Both synthetic projects reset. Local changes are recoverable only from your downloaded backup.",
                    );
                  } catch {
                    setResetOpen(false);
                  }
                }}
              >
                Confirm reset
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function Overview({
  project,
  sponsor,
  navigate,
}: {
  project: Project;
  sponsor: boolean;
  navigate: (index: number) => void;
}) {
  const result = calculateEconomics(project.inputs);
  const gate = assessProject(project);
  const latest = project.decisions.at(-1);
  return (
    <div className="dw-stack">
      <div className="dw-overview-intro" data-tour="brief">
        <div>
          <span className="dw-eyebrow">
            {sponsor
              ? "SPONSOR DECISION BRIEF"
              : "FROM INVESTMENT THESIS TO MEASURED OUTCOME"}
          </span>
          <h2>
            {sponsor
              ? "Is this ready for the next commitment?"
              : "Client value. Delivered."}
          </h2>
          <p>{project.goal}</p>
        </div>
        <button
          className="dw-btn primary"
          onClick={() => navigate(sponsor ? 5 : 2)}
        >
          {sponsor ? "Review decision" : "Inspect the business case"}
          <ArrowRight size={16} />
        </button>
      </div>
      <div className="dw-kpis">
        <Metric
          label="Annual capacity released"
          value={number(result.annualHoursSaved) + " h"}
          note={
            result.fteCapacity.toFixed(2) +
            " FTE equivalent · not job reductions"
          }
        />
        <Metric
          label="Three-year economic NPV"
          value={compact(result.npv)}
          note="Redeployable capacity less investment & OPEX"
          negative={result.npv < 0}
        />
        <Metric
          label="Upfront investment"
          value={compact(project.inputs.implementationCost)}
          note={
            compact(project.inputs.annualRunCost) + " annual operating cost"
          }
        />
        <Metric
          label="Economic payback"
          value={
            result.paybackMonths === null
              ? ">36 months"
              : result.paybackMonths.toFixed(1) + " months"
          }
          note="Monthly ramp-adjusted projection"
        />
      </div>
      <div className="dw-overview-grid">
        <section className="dw-panel dw-next-action">
          <span className="dw-eyebrow">NEXT COMMITMENT</span>
          <h3>
            {gate.recommendation === "Pilot"
              ? "Validate before scaling."
              : gate.recommendation === "Fix"
                ? "Repair the delivery hypothesis."
                : gate.recommendation === "Stop"
                  ? "Do not fund this option."
                  : "Make the accountable decision."}
          </h3>
          <p>{gate.reasons.join(" ")}</p>
          <div className="dw-callout">
            <strong>Economic value is not cash savings.</strong>
            <p>
              {compact(result.cashSavings)} annual cash-saving subset;{" "}
              {compact(result.cashNpv)} cash-only NPV. Finance must confirm the
              realization mechanism.
            </p>
          </div>
          <button className="dw-btn" onClick={() => navigate(5)}>
            Open outcomes & decision
            <ArrowRight size={15} />
          </button>
        </section>
        <section className="dw-panel">
          <div className="dw-panel-title">
            <h3>Engagement control sheet</h3>
            <span className="dw-chip">90-day pilot</span>
          </div>
          <dl className="dw-value-list">
            <div>
              <dt>Accountable sponsor</dt>
              <dd>{project.sponsor}</dd>
            </div>
            <div>
              <dt>Delivery lead</dt>
              <dd>{project.lead}</dd>
            </div>
            <div>
              <dt>Evidence reviewed</dt>
              <dd>
                {project.evidence.filter((e) => e.status === "accepted").length}{" "}
                / {project.evidence.length}
              </dd>
            </div>
            <div>
              <dt>Milestones completed</dt>
              <dd>
                {project.tasks.filter((t) => t.done).length} /{" "}
                {project.tasks.length}
              </dd>
            </div>
            <div>
              <dt>Open risks</dt>
              <dd>{project.risks.filter((r) => !r.closed).length}</dd>
            </div>
            <div>
              <dt>Pilot adoption / quality</dt>
              <dd>
                {project.measurements
                  ? percent(project.measurements.adoption) +
                    " / " +
                    percent(project.measurements.quality)
                  : "Not yet measured"}
              </dd>
            </div>
          </dl>
        </section>
      </div>
      {!sponsor ? (
        <section className="dw-panel">
          <div className="dw-panel-title">
            <div>
              <h3>One engagement. Six connected decisions.</h3>
              <p>
                Every change updates the local record, recommendation and
                downloadable brief.
              </p>
            </div>
          </div>
          <div className="dw-journey">
            {sections.map((item, i) => (
              <button key={item.name} onClick={() => navigate(i)}>
                <span>0{i + 1}</span>
                <strong>{item.name}</strong>
                <small>
                  {
                    [
                      "Frame the client problem",
                      "Inspect and resolve a conflict",
                      "Challenge the investment",
                      "Test outputs and controls",
                      "Manage budget and dependencies",
                      "Measure, decide and follow up",
                    ][i]
                  }
                </small>
                <ArrowRight size={15} />
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="dw-panel">
          <div className="dw-panel-title">
            <h3>Latest sponsor decision</h3>
          </div>
          {latest ? (
            <>
              <h3>
                {latest.decision}
                {latest.revision !== project.revision
                  ? " · reassessment required"
                  : ""}
              </h3>
              <p>{latest.rationale}</p>
              <p>Conditions: {latest.conditions || "None recorded"}</p>
              <p>
                {latest.owner} · follow-up {latest.followUp} · decision revision{" "}
                {latest.revision}
              </p>
            </>
          ) : (
            <p>
              No human decision recorded. The recommendation does not authorize
              investment or deployment.
            </p>
          )}
        </section>
      )}
      {!sponsor ? (
        <details className="dw-panel dw-details">
          <summary>Interview walkthrough · five minutes</summary>
          <ol>
            <li>
              Frame the client problem and the baseline; distinguish capacity
              from cash.
            </li>
            <li>
              Compare a simple rules option, the assisted pilot and the
              expensive automation proposal.
            </li>
            <li>
              Resolve the evidence conflict, then evaluate incorrect outputs and
              human controls.
            </li>
            <li>
              Load an adoption setback, record a conditional recovery decision,
              and show the history.
            </li>
            <li>
              Switch to the reporting case or sponsor view; export the current
              steering pack.
            </li>
          </ol>
          <p>
            Explain what you personally designed and tested. The authored
            fixtures illustrate delivery judgment; they are not a claim of
            client experience or live AI performance.
          </p>
        </details>
      ) : null}
    </div>
  );
}
