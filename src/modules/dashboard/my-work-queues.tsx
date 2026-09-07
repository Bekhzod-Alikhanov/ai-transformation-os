import Link from "next/link";
import type { Route } from "next";

export type MyWorkQueueCounts = {
  sourceReviews: number;
  candidateReviews: number;
  opportunityDrafts: number;
  failedRuns: number;
  decisionsDue: number;
  approvalsAssigned: number;
};

const plural = (count: number, singular: string) =>
  `${count} ${singular}${count === 1 ? "" : "s"}`;

export function MyWorkQueues({ queues }: { queues: MyWorkQueueCounts }) {
  const evidenceReviews = queues.sourceReviews + queues.candidateReviews;
  const items: Array<{ label: string; href: Route; tone: string }> = [
    {
      label: evidenceReviews
        ? plural(evidenceReviews, "evidence review")
        : "No evidence reviews",
      href: "/evidence" as Route,
      tone: "text-[#3157d5]",
    },
    {
      label: queues.opportunityDrafts
        ? plural(queues.opportunityDrafts, "opportunity draft")
        : "No opportunity drafts",
      href: "/opportunities",
      tone: "text-[#25806a]",
    },
    {
      label: queues.failedRuns
        ? plural(queues.failedRuns, "failed run")
        : "No failed runs",
      href: "/activity",
      tone: queues.failedRuns ? "text-[#b54545]" : "text-[#62655d]",
    },
    {
      label: queues.decisionsDue
        ? plural(queues.decisionsDue, "decision due")
        : "No decisions due",
      href: "/decision-room",
      tone: queues.decisionsDue ? "text-[#a8651b]" : "text-[#62655d]",
    },
    {
      label: queues.approvalsAssigned
        ? plural(queues.approvalsAssigned, "approval assigned")
        : "No approvals assigned",
      href: "/approvals",
      tone: queues.approvalsAssigned ? "text-[#3157d5]" : "text-[#62655d]",
    },
  ];
  return (
    <section className="mx-auto max-w-[1320px] pb-16">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#3157d5]">
        Authenticated workspace
      </p>
      <h1 className="mt-2 font-serif text-3xl tracking-[-0.035em]">My Work</h1>
      <p className="mt-2 max-w-2xl text-sm text-[#62655d]">
        The operational queues that need your judgement. Counts reload from
        organisation-scoped records; no synthetic work is mixed into this view.
      </p>
      <div className="mt-6 grid gap-px border border-[#cacbc3] bg-[#cacbc3] sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            className="group flex min-h-28 flex-col justify-between bg-[#fffef9] p-4 transition-colors hover:bg-[#f2f4ff] focus:outline-none focus:ring-2 focus:ring-[#3157d5] focus:ring-inset"
            href={item.href}
            key={item.href}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#66695f]">
              Queue
            </span>
            <span className={`text-sm font-semibold ${item.tone}`}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
