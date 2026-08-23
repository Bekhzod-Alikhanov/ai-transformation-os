"use client";

import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Calculator,
  CheckCircle2,
  FileCheck2,
  GitBranch,
  LineChart,
  Link2,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { opportunities } from "@/modules/demo/aster-data";
import {
  cn,
  formatCompactCurrency,
  formatPercent,
  titleCase,
} from "@/lib/utils";

const tabs = [
  "Overview",
  "Evidence",
  "Economics",
  "Committee",
  "Blueprint",
  "Pilot",
] as const;
type Tab = (typeof tabs)[number];

export function UseCaseWorkspace({ useCaseId }: { useCaseId: string }) {
  const [tab, setTab] = useState<Tab>("Overview");
  const useCase = useMemo(
    () =>
      opportunities.find((item) => item.id === useCaseId) ?? opportunities[0]!,
    [useCaseId],
  );

  return (
    <div className="mx-auto max-w-[1480px] space-y-5 pb-16">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[#777a71]">
            <Link className="hover:text-[#3157d5]" href="/opportunities">
              Opportunities
            </Link>
            <span>/</span>
            <span>{useCase.businessUnit}</span>
            <span>/</span>
            <span>UC-014</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.045em]">
            {useCase.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#666960]">
            {useCase.summary}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge tone="action">Big bet</Badge>
            <Badge tone="condition">Conditional go</Badge>
            <span className="text-xs text-[#777a71]">
              Owned by {useCase.owner}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}
            href="/api/exports/decision-brief"
          >
            <FileCheck2 className="size-3.5" /> Export brief
          </a>
          <Button size="sm">
            <ArrowRight className="size-3.5" /> Build pilot
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto border-b border-[#d9dad4]">
        <div
          className="flex min-w-max gap-1"
          role="tablist"
          aria-label="Use case workspace"
        >
          {tabs.map((item) => (
            <button
              aria-selected={tab === item}
              className={`border-b-2 px-4 py-3 text-xs font-semibold ${tab === item ? "border-[#3157d5] text-[#3157d5]" : "border-transparent text-[#74776e] hover:text-[#30322e]"}`}
              key={item}
              onClick={() => setTab(item)}
              role="tab"
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {tab === "Overview" ? <Overview useCase={useCase} /> : null}
      {tab === "Evidence" ? <Evidence useCase={useCase} /> : null}
      {tab === "Economics" ? <Economics /> : null}
      {tab === "Committee" ? <Committee useCase={useCase} /> : null}
      {tab === "Blueprint" ? <Blueprint /> : null}
      {tab === "Pilot" ? <Pilot /> : null}
    </div>
  );
}

function Overview({ useCase }: { useCase: (typeof opportunities)[number] }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <section className="grid overflow-hidden rounded-lg border border-[#dedfd9] bg-white sm:grid-cols-4">
          {[
            [
              "Risk-adjusted value",
              formatCompactCurrency(useCase.annualValue),
              "from $1.6M original",
              true,
            ],
            ["Portfolio score", String(useCase.score), "Big bet · v1.3", false],
            [
              "Evidence coverage",
              formatPercent(useCase.evidenceCoverage),
              "4 anchored claims",
              false,
            ],
            [
              "Consensus",
              formatPercent(useCase.committee?.consensusConfidence ?? 0),
              "6 specialist reviews",
              false,
            ],
          ].map(([label, value, detail, isValue], index) => (
            <div
              className={`p-5 ${index ? "border-t border-[#e6e7e1] sm:border-l sm:border-t-0" : ""}`}
              key={String(label)}
            >
              <p className="text-xs text-[#74776e]">{label}</p>
              <p
                className="mt-3 text-2xl font-semibold tracking-[-0.04em]"
                data-risk-adjusted-value={isValue ? true : undefined}
              >
                {value}
              </p>
              <p className="mt-2 text-[11px] text-[#777a71]">{detail}</p>
            </div>
          ))}
        </section>

        <Surface className="overflow-hidden">
          <div className="border-b border-[#e4e5df] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#777a71]">
              Case for change
            </p>
            <h2 className="mt-1 text-lg font-semibold">
              Evidence to intervention
            </h2>
          </div>
          <div className="grid gap-px bg-[#e5e6e0] md:grid-cols-3">
            <div className="bg-white p-5">
              <p className="text-xs font-semibold text-[#a1433b]">
                Friction observed
              </p>
              <p className="mt-3 text-sm font-semibold">
                Manual synthesis consumes 490 minutes per reporting cycle
              </p>
              <p className="mt-2 text-xs leading-5 text-[#71746b]">
                Evidence spans calendar cadence, email requests, procedure
                documents, and a cost baseline.
              </p>
            </div>
            <div className="bg-white p-5">
              <p className="text-xs font-semibold text-[#3157d5]">
                Intervention
              </p>
              <p className="mt-3 text-sm font-semibold">
                Evidence-linked reporting agent with deterministic
                reconciliation
              </p>
              <p className="mt-2 text-xs leading-5 text-[#71746b]">
                Humans retain approval. Agents never publish or expand source
                access autonomously.
              </p>
            </div>
            <div className="bg-white p-5">
              <p className="text-xs font-semibold text-[#21806a]">
                Expected result
              </p>
              <p className="mt-3 text-sm font-semibold">
                94% cycle-time reduction with audit-ready source traceability
              </p>
              <p className="mt-2 text-xs leading-5 text-[#71746b]">
                Value is gated by adoption, utilisation, confidence, and
                deployable capacity.
              </p>
            </div>
          </div>
        </Surface>

        <Surface className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#777a71]">
                Evidence highlights
              </p>
              <h2 className="mt-1 text-lg font-semibold">4 anchored claims</h2>
            </div>
            <button
              className="text-xs font-semibold text-[#3157d5]"
              type="button"
            >
              Open ledger
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {useCase.evidence.map((evidence) => (
              <div
                className="rounded-md border border-[#e1e2dc] bg-[#fafaf7] p-3"
                key={evidence.label}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">{evidence.label}</p>
                  <Badge
                    tone={
                      evidence.provenance === "observed" ? "value" : "condition"
                    }
                  >
                    {titleCase(evidence.provenance)}
                  </Badge>
                </div>
                <p className="mt-2 text-lg font-semibold tracking-[-0.025em]">
                  {evidence.value}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-[#777a71]">
                  <Link2 className="size-3" />
                  {evidence.source}
                </p>
              </div>
            ))}
          </div>
        </Surface>
      </div>
      <aside className="space-y-5">
        <Surface className="overflow-hidden">
          <div className="border-b border-[#e4e5df] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#777a71]">
              Decision
            </p>
            <div className="mt-2 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Conditional go</h2>
              <Badge tone="condition">68% confidence</Badge>
            </div>
          </div>
          <div className="p-4">
            <p className="text-xs leading-5 text-[#65685f]">
              Proceed to a 90-day proof of value with adoption and
              source-entitlement gates.
            </p>
            <div className="mt-4 space-y-2 text-xs">
              <p className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-[#21806a]" />
                Baseline is measurable and source-backed
              </p>
              <p className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-[#a1701f]" />
                Capacity cannot be treated as full cash savings
              </p>
              <p className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[#3157d5]" />
                Human approval required before publication
              </p>
            </div>
          </div>
        </Surface>
        <Surface className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#777a71]">
            Next gate
          </p>
          <p className="mt-2 text-sm font-semibold">Pilot design review</p>
          <p className="mt-1 text-xs text-[#70736a]">
            Due 28 Aug · Transformation Council
          </p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#e8e9e3]">
            <div className="h-full w-[72%] rounded-full bg-[#3157d5]" />
          </div>
          <p className="mt-2 text-[11px] text-[#777a71]">
            5 of 7 gate conditions complete
          </p>
        </Surface>
      </aside>
    </div>
  );
}

function Evidence({ useCase }: { useCase: (typeof opportunities)[number] }) {
  return (
    <Surface className="overflow-hidden">
      <div className="border-b border-[#e4e5df] p-5">
        <h2 className="text-lg font-semibold">Canonical evidence ledger</h2>
        <p className="mt-1 text-xs text-[#70736a]">
          Claims remain anchored to their source locator, valid time,
          provenance, and extraction method.
        </p>
      </div>
      <div className="divide-y divide-[#e7e8e2]">
        {useCase.evidence.map((item) => (
          <div
            className="grid gap-3 p-5 md:grid-cols-[1fr_180px_130px] md:items-center"
            key={item.label}
          >
            <div>
              <p className="text-sm font-semibold">
                {item.label}: {item.value}
              </p>
              <p className="mt-1 text-xs text-[#70736a]">{item.source}</p>
            </div>
            <Badge
              tone={item.provenance === "observed" ? "value" : "condition"}
            >
              {titleCase(item.provenance)}
            </Badge>
            <span className="text-xs font-semibold">
              {titleCase(item.confidence)} confidence
            </span>
          </div>
        ))}
      </div>
    </Surface>
  );
}

function Economics() {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
      <Surface className="overflow-hidden">
        <div className="border-b border-[#e4e5df] p-5">
          <h2 className="text-lg font-semibold">Deterministic business case</h2>
          <p className="mt-1 text-xs text-[#70736a]">
            Decimal arithmetic · Financial model v2.2
          </p>
        </div>
        <div className="grid gap-px bg-[#e5e6e0] sm:grid-cols-3">
          {[
            ["Gross annual benefit", "$1.42M"],
            ["Annual run cost", "$320K"],
            ["Net annual benefit", "$1.10M"],
            ["Implementation", "$410K"],
            ["First-year ROI", "168%"],
            ["Monthly payback", "4.5 mo"],
          ].map(([label, value]) => (
            <div className="bg-white p-5" key={label}>
              <p className="text-xs text-[#777a71]">{label}</p>
              <p className="mt-2 text-xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
        <div className="p-5">
          <h3 className="text-sm font-semibold">Formula trace</h3>
          <p className="mt-3 rounded-md bg-[#f5f5f1] p-3 font-mono text-[11px] leading-5 text-[#55584f]">
            employees × tasks/week × 52 × minutes/60 × loaded cost × reduction ×
            adoption × utilisation × redeployability
          </p>
        </div>
      </Surface>
      <Surface className="p-5">
        <LineChart className="size-5 text-[#21806a]" />
        <h2 className="mt-3 text-sm font-semibold">10,000-sample simulation</h2>
        <div className="mt-4 space-y-3">
          {[
            ["P10", "$620K"],
            ["P50", "$1.08M"],
            ["P90", "$1.47M"],
            ["Payback ≤ 12 months", "82%"],
          ].map(([a, b]) => (
            <div className="flex justify-between text-xs" key={a}>
              <span className="text-[#6f7269]">{a}</span>
              <span className="font-semibold">{b}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] leading-4 text-[#777a71]">
          Seed 20260822 · triangular distributions · assumptions v4
        </p>
      </Surface>
    </div>
  );
}

function Committee({ useCase }: { useCase: (typeof opportunities)[number] }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
      <Surface className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#e4e5df] p-5">
          <div>
            <h2 className="text-lg font-semibold">Specialist committee</h2>
            <p className="mt-1 text-xs text-[#70736a]">
              Concise rationale, objections, evidence, and confidence—not
              private reasoning.
            </p>
          </div>
          <Badge tone="condition">68% consensus</Badge>
        </div>
        <div className="divide-y divide-[#e7e8e2]">
          {useCase.committee?.specialists.map((specialist) => (
            <div
              className="grid gap-4 p-5 md:grid-cols-[160px_1fr_100px] md:items-center"
              key={specialist.name}
            >
              <div>
                <p className="text-sm font-semibold">{specialist.name}</p>
                <p className="mt-1 text-[11px] text-[#777a71]">
                  {specialist.role}
                </p>
              </div>
              <p className="text-xs leading-5 text-[#61645c]">
                {specialist.rationale}
              </p>
              <div className="text-right">
                <Badge
                  tone={
                    specialist.position === "support"
                      ? "value"
                      : specialist.position === "challenge"
                        ? "risk"
                        : "condition"
                  }
                >
                  {titleCase(specialist.position)}
                </Badge>
                <p className="mt-2 text-[11px] text-[#777a71]">
                  {formatPercent(specialist.confidence)} confidence
                </p>
              </div>
            </div>
          ))}
        </div>
      </Surface>
      <Surface className="p-5">
        <Users className="size-5 text-[#3157d5]" />
        <h2 className="mt-3 text-sm font-semibold">Consensus method</h2>
        <p className="mt-2 text-xs leading-5 text-[#696c63]">
          Specialist confidence × evidence coverage, reduced by score
          dispersion. Hard gates supersede agent synthesis.
        </p>
        <div className="mt-4 rounded-md border border-[#ead9ae] bg-[#fff9ec] p-3">
          <p className="text-xs font-semibold text-[#8a641b]">
            Policy condition
          </p>
          <p className="mt-1 text-[11px] leading-4 text-[#766339]">
            Pilot must evidence 65% adoption and enforce source entitlements
            before scale.
          </p>
        </div>
      </Surface>
    </div>
  );
}

function Blueprint() {
  return (
    <Surface className="p-5">
      <div className="flex items-center gap-2">
        <Bot className="size-5 text-[#3157d5]" />
        <h2 className="text-lg font-semibold">Controlled agent blueprint v3</h2>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-5">
        {[
          "Evidence retrieval",
          "Reconciliation",
          "Narrative draft",
          "Quality challenge",
          "Human approval",
        ].map((name, index) => (
          <div
            className="relative rounded-md border border-[#dfe0da] bg-[#fafaf7] p-4"
            key={name}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7c7f76]">
              Step {index + 1}
            </p>
            <p className="mt-2 text-sm font-semibold">{name}</p>
            {index < 4 ? (
              <ArrowRight className="absolute -right-4 top-1/2 z-10 hidden size-4 text-[#8a8d84] md:block" />
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          [GitBranch, "Autonomy", "Supervised"],
          [ShieldCheck, "Approval", "Before publication"],
          [Calculator, "Economics", "$4.70 / report"],
        ].map(([Icon, label, value]) => (
          <div
            className="flex items-center gap-3 rounded-md border border-[#e2e3dd] p-3"
            key={String(label)}
          >
            <Icon className="size-4 text-[#3157d5]" />
            <div>
              <p className="text-[11px] text-[#777a71]">{label as string}</p>
              <p className="text-xs font-semibold">{value as string}</p>
            </div>
          </div>
        ))}
      </div>
    </Surface>
  );
}

function Pilot() {
  return (
    <Surface className="p-5">
      <h2 className="text-lg font-semibold">90-day pilot plan</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {[
          [
            "0–30",
            "Instrument & prove",
            "Baseline, access controls, replay evaluation",
          ],
          [
            "31–60",
            "Operate & adopt",
            "Live shadow mode, training, weekly value review",
          ],
          [
            "61–90",
            "Validate & decide",
            "Measured outcomes, risk review, scale gate",
          ],
        ].map(([phase, title, detail]) => (
          <div className="rounded-md border border-[#e0e1db] p-4" key={phase}>
            <Badge tone="action">Days {phase}</Badge>
            <p className="mt-3 text-sm font-semibold">{title}</p>
            <p className="mt-2 text-xs leading-5 text-[#6d7067]">{detail}</p>
          </div>
        ))}
      </div>
    </Surface>
  );
}
