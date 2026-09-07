"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";

import {
  createDemoWorkspaceStore,
  objectionStatus,
  searchDemoWorkspace,
  type DemoCase,
  type DemoWorkspaceState,
} from "./demo-workspace-store";

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function searchKindLabel(kind: string) {
  return kind
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const quietLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5f6259]";
const mutedBodyClass = "text-xs text-[#666961]";
const mutedCaptionClass = "text-[11px] text-[#666961]";
const mutedSourceClass = "mt-1 text-xs text-[#666961]";

function StageRail({ stage }: { stage: DemoCase["stage"] }) {
  const stages: DemoCase["stage"][] = [
    "evidence",
    "economics",
    "committee",
    "challenge",
    "decision",
  ];
  return (
    <ol
      aria-label="Guided demo progress"
      className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-[#5f6259]"
    >
      {stages.map((item) => (
        <li
          className={
            stages.indexOf(item) <= stages.indexOf(stage)
              ? "rounded-full bg-[#edf8f4] px-2 py-1 text-[#16715d]"
              : "rounded-full bg-[#f2f2ed] px-2 py-1"
          }
          key={item}
        >
          {item}
        </li>
      ))}
    </ol>
  );
}

export function SyntheticReplayWorkbench({
  organisationId,
}: {
  organisationId: string;
}) {
  const store = useMemo(
    () => createDemoWorkspaceStore(organisationId),
    [organisationId],
  );
  const [state, setState] = useState<DemoWorkspaceState>(() =>
    store.getState(),
  );
  const [selectedId, setSelectedId] = useState("support-triage");
  const [notice, setNotice] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const replayRootRef = useRef<HTMLDivElement>(null);
  const [customAdoption, setCustomAdoption] = useState("0.62");
  const [customBenefit, setCustomBenefit] = useState("1");
  useEffect(() => {
    const unsubscribe = store.subscribe(() => setState(store.getState()));
    if (replayRootRef.current) {
      replayRootRef.current.dataset.replayReady = "true";
    }
    return () => {
      unsubscribe();
      store.dispose();
    };
  }, [store]);
  const selected =
    state.cases.find((item) => item.id === selectedId) ?? state.cases[0]!;
  const simulation = selected.simulations.base;
  const scenarioComparison = Object.values(selected.simulations);
  const searchResults = searchDemoWorkspace(state, searchQuery);
  const committee = selected.committee;
  const decision = state.decisions.find((item) => item.caseId === selected.id);

  function select(caseId: string) {
    setSelectedId(caseId);
    setNotice("");
  }
  return (
    <div
      className="mx-auto max-w-[1480px] space-y-5 px-3 py-4 sm:px-5 lg:px-8"
      data-replay-ready="false"
      ref={replayRootRef}
    >
      <div className="flex flex-col gap-3 border-b border-[#dedfd9] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone="value">Synthetic Replay</Badge>
            <span className="text-xs text-[#6c7066]">
              Local-only, non-production persistence
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-[#20221e]">
            Evidence to governed decision
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#696c63]">
            A guided four-minute replay. All evidence, costs, agents, and
            decisions are simulated locally.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            store.reset();
            setSelectedId("support-triage");
            setNotice("Stable Synthetic Replay seed restored locally.");
          }}
        >
          Reset replay
        </Button>
      </div>

      <nav
        aria-label="Synthetic cases"
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {state.cases.map((item) => (
          <Button
            key={item.id}
            variant={item.id === selected.id ? "primary" : "secondary"}
            size="sm"
            onClick={() => select(item.id)}
          >
            {item.name}
          </Button>
        ))}
      </nav>

      <div className="flex justify-end xl:hidden">
        <Button
          aria-expanded={inspectorOpen}
          aria-controls="replay-inspector"
          size="sm"
          variant="secondary"
          onClick={() => setInspectorOpen((open) => !open)}
        >
          {inspectorOpen
            ? "Close evidence inspector"
            : "Open evidence inspector"}
        </Button>
      </div>

      <section
        className="relative border-y border-[#dedfd9] bg-[#faf9f5] py-3"
        aria-label="Local evidence search"
      >
        <label className="sr-only" htmlFor="local-replay-search">
          Search local replay
        </label>
        <input
          className="w-full rounded-md border border-[#cbd4f7] bg-white px-4 py-3 text-sm outline-none ring-[#3157d5]/30 focus:ring-2"
          id="local-replay-search"
          placeholder="Search three cases, evidence, decisions, or activity…"
          role="searchbox"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
        {searchQuery ? (
          <div
            className="mt-2 grid gap-2 border-l-2 border-[#3157d5] pl-3"
            aria-live="polite"
          >
            {searchResults.length ? (
              searchResults.map((result) => (
                <button
                  aria-label={`${result.label} · ${searchKindLabel(result.kind)}`}
                  className="grid grid-cols-[132px_1fr] gap-3 rounded-md px-2 py-2 text-left text-xs hover:bg-[#edf0fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157d5]"
                  key={result.id}
                  type="button"
                  onClick={() => {
                    select(result.caseId);
                    setSearchQuery("");
                    setNotice(
                      `Opened ${result.label} from local Synthetic Replay search.`,
                    );
                  }}
                >
                  <span className="font-semibold uppercase tracking-[0.1em] text-[#3157d5]">
                    {searchKindLabel(result.kind)}
                  </span>
                  <span>
                    <span className="font-semibold">{result.label}</span>
                    <span className="block pt-0.5 text-[#6d7067]">
                      {result.detail}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <p className="px-2 py-3 text-sm text-[#6d7067]">
                No local replay records match “{searchQuery}”. Clear the search
                or reset the stable seed.
              </p>
            )}
          </div>
        ) : null}
      </section>

      <div className="grid gap-5 xl:grid-cols-[174px_minmax(0,1fr)_300px]">
        <aside className="xl:pt-3">
          <p className={quietLabelClass}>Guided path</p>
          <StageRail stage={selected.stage} />
          <p className="mt-4 text-xs leading-5 text-[#686b63]">
            Support Triage is the hero path. The other two cases are equally
            self-contained Synthetic Replays.
          </p>
        </aside>
        <main className="space-y-5">
          <Surface className="overflow-hidden">
            <div className="border-b border-[#e4e5df] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className={quietLabelClass}>
                    {selected.stage} · Synthetic Replay
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">
                    {selected.name}
                  </h2>
                </div>
                <Badge tone="action">Score {selected.score}/100</Badge>
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#666961]">
                {selected.summary}
              </p>
            </div>
            <section className="p-5" aria-labelledby="evidence-title">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 id="evidence-title" className="text-lg font-semibold">
                    Accepted evidence ledger
                  </h3>
                  <p className="mt-1 text-xs text-[#70736a]">
                    Synthetic excerpts with source locator, acceptance, and
                    confidence.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    store.reviseAssumption(
                      selected.id,
                      "adoption",
                      selected.assumptions.adoption.value,
                      "Demo operator",
                    );
                    setNotice(
                      "Assumption provenance revision saved to local replay history.",
                    );
                  }}
                >
                  Open economics
                </Button>
              </div>
              <div className="mt-4 divide-y divide-[#e7e8e2] border-y border-[#e7e8e2]">
                {selected.evidence.map((evidence) => (
                  <div
                    className="grid gap-2 py-3 md:grid-cols-[1fr_120px]"
                    key={evidence.id}
                  >
                    <div>
                      <p className="text-sm text-[#363832]">
                        “{evidence.excerpt}”
                      </p>
                      <p className={mutedSourceClass}>{evidence.source}</p>
                    </div>
                    <div className="md:text-right">
                      <Badge tone={evidence.accepted ? "value" : "condition"}>
                        {evidence.accepted ? "Accepted" : "Conflicting"}
                      </Badge>
                      <p className={mutedCaptionClass}>
                        {evidence.confidence} confidence
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </Surface>

          <Surface className="overflow-hidden">
            <div className="border-b border-[#e4e5df] p-5">
              <h3 className="text-lg font-semibold">
                Assumptions & deterministic economics
              </h3>
              <p className="mt-1 text-xs text-[#70736a]">
                Financial Engine values; simulated costs are clearly marked and
                no service is called.
              </p>
            </div>
            <div className="grid gap-px bg-[#e5e6e0] sm:grid-cols-4">
              {[
                ["3-year NPV", money(selected.economics.threeYearNpv)],
                [
                  "First-year ROI",
                  `${Math.round((selected.economics.firstYearRoi ?? 0) * 100)}%`,
                ],
                [
                  "Payback",
                  selected.economics.paybackMonths
                    ? `${selected.economics.paybackMonths} mo`
                    : "n/a",
                ],
                [
                  "Annual run cost",
                  money(selected.economics.annualOperatingCost),
                ],
              ].map(([label, value]) => (
                <div className="bg-white p-4" key={label}>
                  <p className={mutedBodyClass}>{label}</p>
                  <p className="mt-2 text-xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-[1fr_auto]">
              <label className="text-sm font-semibold">
                Adoption assumption · revision{" "}
                {selected.assumptions.adoption.revision}
                <input
                  aria-label="Adoption assumption"
                  className="mt-2 block w-full rounded-md border border-[#d9dad4] px-3 py-2 text-sm"
                  max="0.95"
                  min="0.2"
                  step="0.01"
                  type="number"
                  value={selected.assumptions.adoption.value}
                  onChange={(event) =>
                    store.reviseAssumption(
                      selected.id,
                      "adoption",
                      Number(event.target.value),
                      "Demo operator",
                    )
                  }
                />
                <span className="mt-1 block text-xs font-normal text-[#70736a]">
                  {selected.assumptions.adoption.provenance} ·{" "}
                  {selected.assumptions.adoption.confidence} confidence ·{" "}
                  {selected.assumptions.adoption.evidenceId}
                </span>
              </label>
              <div className="flex flex-wrap content-start gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    store.runSimulation(selected.id, "base");
                    setNotice("10,000-sample base simulation stored locally.");
                  }}
                >
                  Run base simulation
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    store.runSimulation(selected.id, "conservative")
                  }
                >
                  Conservative
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => store.runSimulation(selected.id, "upside")}
                >
                  Upside
                </Button>
              </div>
            </div>
            <div className="grid gap-3 border-t border-[#e4e5df] p-5 md:grid-cols-[1fr_1fr_auto]">
              <label className="text-xs font-semibold text-[#55584f]">
                Custom adoption
                <input
                  aria-label="Custom adoption"
                  className="mt-1 block w-full rounded-md border border-[#d9dad4] px-3 py-2 text-sm"
                  max="0.95"
                  min="0.2"
                  step="0.01"
                  type="number"
                  value={customAdoption}
                  onChange={(event) => setCustomAdoption(event.target.value)}
                />
              </label>
              <label className="text-xs font-semibold text-[#55584f]">
                Custom benefit factor
                <input
                  aria-label="Custom benefit factor"
                  className="mt-1 block w-full rounded-md border border-[#d9dad4] px-3 py-2 text-sm"
                  max="1.5"
                  min="0.5"
                  step="0.01"
                  type="number"
                  value={customBenefit}
                  onChange={(event) => setCustomBenefit(event.target.value)}
                />
              </label>
              <Button
                className="self-end"
                size="sm"
                variant="secondary"
                onClick={() => {
                  try {
                    store.runSimulation(selected.id, "custom", {
                      adoption: Number(customAdoption),
                      benefit: Number(customBenefit),
                    });
                    setNotice(
                      "Custom 10,000-sample simulation stored locally.",
                    );
                  } catch (error) {
                    setNotice(
                      error instanceof Error
                        ? error.message
                        : "Custom scenario is invalid.",
                    );
                  }
                }}
              >
                Run custom scenario
              </Button>
            </div>
            {simulation ? (
              <div className="border-t border-[#e4e5df] p-5">
                <p className="text-sm font-semibold">
                  Base simulation · 10,000 samples · seed {simulation.seed}
                </p>
                <p className="mt-2 text-xs text-[#6d7067]">
                  P10 {money(simulation.p10)} · P50 {money(simulation.p50)} ·
                  P90 {money(simulation.p90)} · payback ≤ 12 months{" "}
                  {Math.round(
                    simulation.paybackWithinTwelveMonthsProbability * 100,
                  )}
                  %
                </p>
                <div
                  className="mt-3 flex h-10 items-end gap-1"
                  aria-label="Simulation histogram"
                >
                  {simulation.histogram.map((bucket) => (
                    <span
                      className="flex-1 bg-[#b9ddd3]"
                      key={bucket.from}
                      style={{ height: `${Math.max(14, bucket.count / 15)}%` }}
                      title={`${money(bucket.from)} to ${money(bucket.to)}`}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            {scenarioComparison.length ? (
              <div className="border-t border-[#e4e5df] p-5">
                <p className="text-sm font-semibold">Scenario comparison</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  {scenarioComparison.map((summary) => (
                    <div
                      className="rounded-md bg-[#f7f7f3] p-3 text-xs"
                      key={summary.scenario}
                    >
                      <p className="font-semibold capitalize">
                        {summary.scenario} simulation · 10,000 samples
                      </p>
                      <p className="mt-1 text-[#6d7067]">
                        P50 {money(summary.p50)} ·{" "}
                        {Math.round(
                          summary.paybackWithinTwelveMonthsProbability * 100,
                        )}
                        % payback
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {selected.assumptionRevisions.length ? (
              <div className="border-t border-[#e4e5df] p-5">
                <p className="text-sm font-semibold">
                  Immutable assumption history
                </p>
                <ul className="mt-3 space-y-2 text-xs text-[#666961]">
                  {selected.assumptionRevisions.map((revision) => (
                    <li key={revision.id}>
                      v{revision.version} · {revision.assumptionKey}{" "}
                      {revision.oldValue} → {revision.newValue} ·{" "}
                      {revision.provenance}/{revision.confidence} ·{" "}
                      {revision.evidenceId} · {revision.owner}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Surface>

          <Surface className="overflow-hidden">
            <div className="border-b border-[#e4e5df] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">
                    Synthetic Committee Replay
                  </h3>
                  <p className="mt-1 text-xs text-[#70736a]">
                    Specialist events cite accepted synthetic evidence. Token
                    costs are simulated.
                  </p>
                </div>
                {committee.status === "failed" ? (
                  <Button
                    size="sm"
                    onClick={() => store.retryCommittee(selected.id)}
                  >
                    Retry committee replay
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => store.runCommittee(selected.id)}
                  >
                    Run Synthetic Committee Replay
                  </Button>
                )}
              </div>
            </div>
            <div className="p-5">
              {committee.status === "idle" ? (
                <p className="text-sm text-[#70736a]">
                  Run the local replay to inspect specialist rationale and the
                  scripted failure.
                </p>
              ) : (
                <>
                  <div className="h-2 overflow-hidden rounded-full bg-[#edf0ea]">
                    <div
                      className="h-full bg-[#3157d5]"
                      style={{ width: `${committee.progress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-[#70736a]">
                    {committee.progress}% complete · $
                    {committee.simulatedCost.toFixed(2)} simulated cost
                  </p>
                  <div className="mt-4 space-y-3">
                    {committee.events.map((event) => (
                      <div
                        className="rounded-md border border-[#e0e1db] p-3"
                        key={event.specialist}
                      >
                        <div className="flex justify-between gap-3">
                          <p className="text-sm font-semibold">
                            {event.specialist}
                          </p>
                          <Badge
                            tone={event.status === "failed" ? "risk" : "value"}
                          >
                            {event.status}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-[#666961]">
                          {event.rationale}
                        </p>
                        <p className={mutedCaptionClass}>
                          {event.invalidCitations?.length
                            ? `Invalid or rejected citations: ${event.invalidCitations.join(", ")}`
                            : `Accepted citations: ${event.citations.join(", ")}`}{" "}
                          · ${event.simulatedTokenCost.toFixed(2)} simulated
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </Surface>

          <Surface className="p-5">
            <h3 className="text-lg font-semibold">
              CFO Red Team & governed decision
            </h3>
            <p className="mt-1 text-xs text-[#70736a]">
              A stored challenge linked to the adoption revision; resolution
              remains auditable locally.
            </p>
            {selected.objections.map((objection) => (
              <div
                className="mt-4 rounded-md border border-[#ead9ae] bg-[#fff9ec] p-4"
                key={objection.id}
              >
                <p className="text-sm font-semibold">{objection.question}</p>
                <p className="mt-1 text-xs text-[#766339]">
                  Status: {objectionStatus(objection)} · assumption revision{" "}
                  {selected.assumptions[objection.assumptionKey].revision}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      store.resolveObjection(selected.id, objection.id, {
                        status: "resolved",
                        actor: "Beck",
                        rationale:
                          "Control owner confirmed the capacity treatment.",
                      })
                    }
                  >
                    Resolve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      store.resolveObjection(selected.id, objection.id, {
                        status: "accepted",
                        actor: "Beck",
                        rationale: "Risk accepted for this constrained pilot.",
                      })
                    }
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      store.resolveObjection(selected.id, objection.id, {
                        status: "request_evidence",
                        actor: "Beck",
                        rationale:
                          "Request measured adoption evidence before the decision gate.",
                      })
                    }
                  >
                    Request evidence
                  </Button>
                </div>
                {objection.actions.length ? (
                  <ul className="mt-3 space-y-1 text-[11px] text-[#766339]">
                    {objection.actions.map((action) => (
                      <li key={action.id}>
                        {action.status} · {action.actor} · revision{" "}
                        {action.assumptionRevision} · {action.rationale}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  store.appendDecision(selected.id, {
                    recommendation: "conditional_go",
                    beckDecision: "approved",
                    rationale:
                      "Proceed only with measured adoption and reviewer controls.",
                    conditions: [
                      "Validate adoption after 30 days",
                      "Maintain human approval",
                    ],
                    followUp: "Review pilot measurement",
                    override: "",
                  });
                  setNotice(
                    "Decision recorded locally in portfolio, My Work, activity, and exports.",
                  );
                }}
              >
                Record Beck decision
              </Button>
            </div>
            {decision ? (
              <p className="mt-3 text-sm font-semibold text-[#16715d]">
                Beck {decision.beckDecision} {decision.recommendation} ·
                decision recorded locally
              </p>
            ) : null}
          </Surface>
        </main>
        <aside
          className={`${inspectorOpen ? "block" : "hidden"} space-y-4 xl:block`}
          id="replay-inspector"
        >
          <Surface className="p-4">
            <p className={quietLabelClass}>Replay guardrail</p>
            <p className="mt-2 text-sm font-semibold">
              No providers. No database.
            </p>
            <p className="mt-2 text-xs leading-5 text-[#696c63]">
              Browser-local Synthetic Replay state is versioned and can be
              reset. Malformed or old local state recovers to the stable seed;
              it never represents production persistence.
            </p>
          </Surface>
          <Surface className="p-4">
            <p className={quietLabelClass}>Local activity</p>
            <ul className="mt-3 space-y-3">
              {state.activity
                .slice(-4)
                .reverse()
                .map((event) => (
                  <li
                    className="text-xs leading-5 text-[#686b63]"
                    key={event.id}
                  >
                    {event.detail}
                  </li>
                ))}
            </ul>
          </Surface>
        </aside>
      </div>
      {notice ? (
        <p
          aria-live="polite"
          className="rounded-md border border-[#b9ddd3] bg-[#edf8f4] px-4 py-3 text-sm text-[#16715d]"
        >
          {notice}
        </p>
      ) : null}
    </div>
  );
}
