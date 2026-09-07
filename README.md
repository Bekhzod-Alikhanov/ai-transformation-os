# AI Transformation OS

An evidence-led executive workbench for discovering, deciding, and governing AI transformation. The shipped experience is the credential-free **Sia Partners Synthetic Replay**: three deep cases (Support Triage, Executive Reporting, and Procurement Analysis), source-anchored evidence, deterministic economics, local committee replay, CFO challenge, and governed decisions.

The default experience is **Synthetic Replay**. It needs no OpenAI, Google, Supabase, Inngest, database, or provider credentials and never performs an external action. Every case, cost, agent event, and browser-local record is labelled synthetic/non-production.

## Quick start

Requirements: Node.js 22+ and pnpm 10.33.2. No Docker, database, provider account, OAuth client, or API key is needed for the replay.

```powershell
corepack prepare pnpm@10.33.2 --activate
pnpm install
$env:DEMO_MODE = "true"
$env:DEMO_SESSION_SECRET = "local-sia-replay-session-secret-2026"
pnpm dev
```

Open [http://localhost:3000/demo](http://localhost:3000/demo). The local server creates an expiring synthetic session; the replay itself persists only in browser-local storage and can be reset to the stable three-case seed.

## What is implemented

- One self-contained `/demo` executive evidence workbench with local search across the three cases, their synthetic sources and accepted evidence, use cases, decisions, and activity.
- Organisation membership and `owner`, `admin`, `transformation_lead`, `analyst`, `approver`, and `viewer` roles, with tenant RLS on every tenant-owned table and organisation-prefixed private storage.
- Canonical evidence ledger with source locators, provenance, confidence, extraction method, valid time, and immutable material evidence.
- Isolated PDF, DOCX, XLSX, CSV, TXT, and Markdown parsing. Low-text PDFs produce an explicit OCR requirement. Source content is always treated as untrusted data.
- Deterministic portfolio classification, Decimal.js financial calculations, seeded 10,000-sample Monte Carlo simulation, scenario patch validation, committee consensus, policy gates, autonomy policy, and pilot value recommendations.
- A deterministic local financial engine, seeded 10,000-sample simulation summaries, validated custom comparison, citation-checked Synthetic Committee Replay, CFO action history, and append-only demo decisions.
- Responsive evidence inspector, guided four-minute Support Triage review, accessible local search, and stable reset/recovery behavior.

## Synthetic Replay boundary

| Mode             | Provider calls | External effects | Label                      |
| ---------------- | -------------: | ---------------: | -------------------------- |
| Synthetic Replay |           None |             None | Always visible, local-only |

The demo never shows provider controls, never calls a provider or database route, and stores no raw simulation samples. Provider adapters remain outside the replay boundary and require separate production design, security review, and setup.

## Verification

```powershell
corepack pnpm verify

```

`verify` runs formatting, lint, strict types, unit tests, secret scanning, the production build, and Playwright when local browser binaries are installed. Replay tests cover 1440px, 1024px, and 390px paths without provider credentials.

## Deployment

- The shipped Sia replay has no deployment provider dependency. It is a local Next.js experience with browser-local persistence.

See [architecture](docs/architecture.md), [security model](docs/threat-model.md), [connector operations](docs/connectors.md), and [P2 contracts](docs/p2-extension-contracts.md).
