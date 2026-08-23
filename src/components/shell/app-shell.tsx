"use client";

import type { LucideIcon } from "lucide-react";
import type { Route } from "next";
import {
  Activity,
  AppWindow,
  Bell,
  Bot,
  Boxes,
  BriefcaseBusiness,
  ChevronDown,
  CircleDollarSign,
  FlaskConical,
  Gauge,
  GitPullRequestArrow,
  LayoutDashboard,
  Network,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Waypoints,
  Workflow,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type NavigationItem = { label: string; href: string; icon: LucideIcon };
type NavigationGroup = { label: string; items: NavigationItem[] };

const navigation: NavigationGroup[] = [
  {
    label: "Discover",
    items: [
      { label: "Overview", href: "/", icon: LayoutDashboard },
      { label: "Opportunities", href: "/opportunities", icon: Search },
      {
        label: "Processes",
        href: "/processes/client-status-reporting",
        icon: Workflow,
      },
    ],
  },
  {
    label: "Decide",
    items: [
      { label: "Portfolio", href: "/portfolio", icon: Gauge },
      { label: "Decision Room", href: "/decision-room", icon: ShieldCheck },
      { label: "Model Lab", href: "/model-lab", icon: FlaskConical },
    ],
  },
  {
    label: "Deliver",
    items: [
      {
        label: "Agent blueprints",
        href: "/use-cases/client-status-reporting?view=blueprint",
        icon: Bot,
      },
      { label: "Pilots", href: "/pilots", icon: BriefcaseBusiness },
      { label: "Automations", href: "/automations", icon: Zap },
    ],
  },
  {
    label: "Measure",
    items: [
      { label: "Value", href: "/value", icon: CircleDollarSign },
      { label: "Activity", href: "/activity", icon: Activity },
    ],
  },
  {
    label: "Govern",
    items: [
      { label: "Approvals", href: "/approvals", icon: GitPullRequestArrow },
      { label: "Integrations", href: "/integrations", icon: Network },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href.split("?")[0]!);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f3f2ec] text-[#20221e]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[244px] flex-col border-r border-[#dadbd4] bg-[#f9f8f3] lg:flex">
        <Link
          className="flex h-[72px] items-center gap-3 border-b border-[#e2e2dc] px-5"
          href="/"
        >
          <span className="grid size-9 place-items-center rounded-md bg-[#20221e] text-white">
            <Boxes className="size-[18px]" strokeWidth={1.9} />
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-semibold tracking-[-0.02em]">
              Aster AI OS
            </span>
            <span className="block text-[11px] text-[#65685f]">
              Transformation control
            </span>
          </span>
        </Link>

        <nav
          aria-label="Primary navigation"
          className="flex-1 overflow-y-auto px-3 py-5"
        >
          {navigation.map((group) => (
            <div className="mb-5" key={group.label}>
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#65685f]">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex h-9 items-center gap-3 rounded-md px-2.5 text-[13px] font-medium text-[#5d6058] transition-colors hover:bg-[#eeeee8] hover:text-[#20221e]",
                        active && "bg-[#e8ebf8] text-[#2849bb]",
                      )}
                      href={item.href as Route}
                      key={item.label}
                    >
                      <Icon className="size-4" strokeWidth={active ? 2 : 1.7} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-[#e2e2dc] p-3">
          <div className="rounded-md border border-[#dedfd8] bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <Badge tone="value">Synthetic enterprise</Badge>
              <Sparkles className="size-3.5 text-[#25806a]" />
            </div>
            <p className="text-xs font-semibold">Aster Financial Group</p>
            <p className="mt-1 text-[11px] leading-4 text-[#65685f]">
              Safe replay mode · no external actions
            </p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[244px]">
        <header className="sticky top-0 z-30 flex h-[64px] items-center justify-between border-b border-[#dedfd8] bg-[#f9f8f3]/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <span className="grid size-9 place-items-center rounded-md bg-[#20221e] text-white">
              <Boxes className="size-4" />
            </span>
            <span className="text-sm font-semibold">Aster AI OS</span>
          </div>
          <Link
            className="hidden h-9 w-72 items-center gap-2 rounded-md border border-[#dddeda] bg-white px-3 text-left text-xs text-[#65685f] sm:flex"
            href="/opportunities"
          >
            <Search className="size-3.5" /> Search evidence, cases, pilots…
            <kbd className="ml-auto rounded border border-[#dedfd9] bg-[#f7f7f3] px-1.5 py-0.5 font-sans text-[10px]">
              ⌘K
            </kbd>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              aria-label="Open Control Tower"
              className="hidden h-9 items-center gap-2 rounded-md border border-[#ccd4f4] bg-[#f4f6ff] px-3 text-xs font-semibold text-[#3157d5] sm:flex"
              href="/decision-room#control-tower"
            >
              <Sparkles className="size-3.5" /> Control Tower
            </Link>
            <button
              aria-label="Notifications"
              className="grid size-9 place-items-center rounded-md border border-[#dedfd9] bg-white text-[#64675f]"
              type="button"
            >
              <Bell className="size-4" />
            </button>
            <button
              className="flex h-9 items-center gap-2 rounded-md border border-[#dedfd9] bg-white pl-1.5 pr-2 text-xs font-medium"
              type="button"
            >
              <span className="grid size-6 place-items-center rounded bg-[#dfe6ff] text-[10px] font-bold text-[#3157d5]">
                MC
              </span>
              <span className="hidden sm:inline">Maya Chen</span>
              <ChevronDown className="size-3" />
            </button>
          </div>
        </header>

        <main className="min-h-[calc(100vh-64px)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>

        <nav
          aria-label="Mobile navigation"
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[#dadbd4] bg-[#faf9f5] px-2 py-1 lg:hidden"
        >
          {(
            [
              { label: "Home", href: "/", icon: AppWindow },
              { label: "Discover", href: "/opportunities", icon: Search },
              { label: "Decide", href: "/decision-room", icon: Waypoints },
              { label: "Deliver", href: "/pilots", icon: BriefcaseBusiness },
              { label: "Govern", href: "/approvals", icon: ShieldCheck },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                className="flex flex-col items-center gap-0.5 py-1 text-[10px] font-medium text-[#65685f]"
                href={item.href}
                key={item.label}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
