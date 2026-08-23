"use client";

import { ArrowUpDown, Filter, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { opportunities } from "@/modules/demo/aster-data";
import { formatCompactCurrency, formatPercent, titleCase } from "@/lib/utils";

export function OpportunityTable() {
  const [query, setQuery] = useState("");
  const [classification, setClassification] = useState("all");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return opportunities.filter((item) => {
      const matchesQuery =
        !normalized ||
        `${item.title} ${item.businessUnit} ${item.tags.join(" ")}`
          .toLowerCase()
          .includes(normalized);
      const matchesClass =
        classification === "all" || item.classification === classification;
      return matchesQuery && matchesClass;
    });
  }, [classification, query]);

  return (
    <Surface className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-[#e3e4de] p-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 md:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#868980]" />
          <input
            aria-label="Search opportunities"
            className="h-10 w-full rounded-md border border-[#d9dad4] bg-white pl-9 pr-3 text-sm outline-none placeholder:text-[#989b92] focus:border-[#7f94de] focus:ring-2 focus:ring-[#3157d5]/10"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, unit, or tag"
            type="search"
            value={query}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="classification">
            Classification
          </label>
          <select
            className="h-10 rounded-md border border-[#d9dad4] bg-white px-3 text-xs font-medium text-[#55584f] outline-none"
            id="classification"
            onChange={(event) => setClassification(event.target.value)}
            value={classification}
          >
            <option value="all">All classifications</option>
            <option value="quick_win">Quick wins</option>
            <option value="big_bet">Big bets</option>
            <option value="strategic_enabler">Strategic enablers</option>
            <option value="experiment">Experiments</option>
            <option value="defer">Defer</option>
            <option value="stop">Stop</option>
          </select>
          <Button
            aria-label="Portfolio filters"
            size="icon"
            variant="secondary"
          >
            <SlidersHorizontal className="size-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#e5e6e0] bg-[#fafaf7] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#65685f]">
              <th className="px-5 py-3">Opportunity</th>
              <th className="px-4 py-3">Classification</th>
              <th className="px-4 py-3">
                <span className="flex items-center gap-1">
                  Annual value <ArrowUpDown className="size-3" />
                </span>
              </th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Evidence</th>
              <th className="px-4 py-3">Risk</th>
              <th className="px-5 py-3">Stage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8e9e3]">
            {filtered.map((item) => {
              const classificationTone =
                item.classification === "stop"
                  ? "risk"
                  : item.classification === "defer" ||
                      item.classification === "experiment"
                    ? "condition"
                    : item.classification === "quick_win"
                      ? "value"
                      : "action";
              return (
                <tr className="group hover:bg-[#fafaf7]" key={item.id}>
                  <td className="px-5 py-4">
                    <Link
                      className="text-sm font-semibold tracking-[-0.01em] text-[#292b27] group-hover:text-[#3157d5] group-hover:underline"
                      href={`/use-cases/${item.id}`}
                    >
                      {item.title}
                    </Link>
                    <p className="mt-1 text-[11px] text-[#65685f]">
                      {item.businessUnit} · {item.owner}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <Badge tone={classificationTone}>
                      {titleCase(item.classification)}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold tabular-nums">
                    {formatCompactCurrency(item.annualValue)}
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex size-8 items-center justify-center rounded-full border border-[#dcded7] text-xs font-semibold">
                      {item.score}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#e8e9e3]">
                        <div
                          className="h-full rounded-full bg-[#25806a]"
                          style={{ width: `${item.evidenceCoverage * 100}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-[#62655d]">
                        {formatPercent(item.evidenceCoverage)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={
                        item.risk > 65
                          ? "text-[#a43d36]"
                          : item.risk > 45
                            ? "text-[#946b1f]"
                            : "text-[#25806a]"
                      }
                    >
                      {item.risk}/100
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs font-medium text-[#60635b]">
                    {titleCase(item.status)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-[#e3e4de] bg-[#fafaf7] px-5 py-3 text-xs text-[#65685f]">
        <span>
          {filtered.length} of {opportunities.length} opportunities
        </span>
        <span className="flex items-center gap-1.5">
          <Filter className="size-3.5" /> Deterministic scoring · v1.3
        </span>
      </div>
    </Surface>
  );
}
