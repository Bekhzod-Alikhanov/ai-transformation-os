# AI Transformation OS

An evidence-led, multi-tenant enterprise control room for discovering, deciding, delivering, measuring, and governing AI transformation. The repository ships with the complete fictional Aster Financial Group journey: 8 business units, 27 opportunities, 6 pilots, 4 approval decisions, source-anchored evidence, deterministic economics, governed agents, and exportable steering material.

The default experience is **Aster Synthetic Replay**. It needs no OpenAI, Google, Supabase, or Inngest credentials and never performs an external action. All fictional identities, messages, meetings, files, and financial values are labeled synthetic.

## Quick start

Requirements: Node.js 22+, pnpm 10.33.2, and optionally Docker + Supabase CLI for the local production topology.

```powershell
corepack prepare pnpm@10.33.2 --activate
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

Set a local `DEMO_SESSION_SECRET` of at least 32 random characters in `.env.local`. Open [http://localhost:3000](http://localhost:3000). The server creates an HTTP-only, expiring synthetic session on first page load.

For the database-backed topology:

```powershell
supabase start
supabase db reset
pnpm dev
```

`supabase db reset` applies [the tenant schema](supabase/migrations/202608220001_initial_schema.sql) and [stable Aster seed](supabase/seed.sql). Generated schema types are checked into `src/lib/supabase/database.types.ts`; refresh them with `supabase gen types typescript --local`.

## What is implemented

- Executive control room and all primary routes: `/`, `/opportunities`, `/portfolio`, `/use-cases/[id]`, `/processes/[id]`, `/decision-room`, `/model-lab`, `/pilots`, `/value`, `/automations`, `/approvals`, `/integrations`, `/activity`, and `/settings`.
- Organisation membership and `owner`, `admin`, `transformation_lead`, `analyst`, `approver`, and `viewer` roles, with tenant RLS on every tenant-owned table and organisation-prefixed private storage.
- Canonical evidence ledger with source locators, provenance, confidence, extraction method, valid time, and immutable material evidence.
- Isolated PDF, DOCX, XLSX, CSV, TXT, and Markdown parsing. Low-text PDFs produce an explicit OCR requirement. Source content is always treated as untrusted data.
- Deterministic portfolio classification, Decimal.js financial calculations, seeded 10,000-sample Monte Carlo simulation, scenario patch validation, committee consensus, policy gates, autonomy policy, and pilot value recommendations.
- Eleven dedicated Zod-constrained agent definitions. Luna handles extraction/tagging, Terra structured routine analysis, and Sol synthesis, red-team, and redesign. Application-managed orchestration is the stable path; native multi-agent is disabled behind `ENABLE_NATIVE_MULTI_AGENT`.
- Inngest workflows for ingestion, independently retried committee specialists, simulation, approval execution, connector sync, watch renewal, pilot monitoring, model benchmarks, and exports.
- Gmail and Google Calendar incremental OAuth scopes, encrypted refresh-token envelopes, history/sync cursors, watch/channel renewal, verified webhook tokens, fallback sync, exact reviewed payload execution, and distinct Gmail draft/send approvals.
- Working support triage, executive reporting, and procurement analysis proof-of-value templates in Synthetic Replay, with the same event contract used in live mode.
- Constrained WHEN / IF / THEN / APPROVAL automation recipes; arbitrary code is not accepted.
- Editable PPTX steering packs and PDF decision briefs generated from an immutable portfolio snapshot.
- Honest P2 extension entries: Salesforce, ServiceNow, generic enterprise providers, and generic MCP execution remain adapter-only or disabled.

## Runtime modes

| Mode                 |   Provider calls |       External effects | Label                  |
| -------------------- | ---------------: | ---------------------: | ---------------------- |
| Synthetic Replay     |             None |                   None | Always visible         |
| Live agent run       | OpenAI Responses |        None by default | Live                   |
| Connected read sync  |      Google APIs |              Read-only | Connected              |
| Approved draft/event |      Google APIs | Exact reviewed payload | Approval receipt       |
| Gmail send           |      Google APIs | Exact reviewed message | Separate send approval |

OpenAI model IDs, reasoning effort, price placeholders, and effective dates live in `src/config/models.ts`. Prices are intentionally not hard-coded as truth: revalidate availability and pricing before deployment.

## Google production setup

1. Configure OAuth client credentials, callback URL, Pub/Sub topic, and verified HTTPS webhook URLs.
2. Begin with `gmail.readonly` or `calendar.events.readonly`. Request `gmail.compose` or `calendar.events.owned` only when the user enables the associated capability.
3. Set a base64-encoded 32-byte `INTEGRATION_ENCRYPTION_KEY`; rotate by incrementing the stored key version and retaining old decrypt keys during migration.
4. Configure Pub/Sub push with the secret verification token. Calendar channels must carry the configured channel token.
5. Complete Google verification before public production use of restricted Gmail scopes.

No token, email body, event description, or source content is written to application logs.

## Verification

```powershell
corepack pnpm verify

# Requires Docker and the Supabase CLI:
corepack pnpm verify:full
```

`verify` runs formatting, lint, strict types, unit/contract/export tests, secret scanning, the production build, and Playwright. `verify:full` adds the pgTAP tenant-isolation suite. Playwright runs the control room at 1440px, 1024px, and 390px. The graph is review-first on mobile, while decision and approval flows stay actionable.

## Deployment

- Web: Vercel, including `src/app/api/inngest/route.ts`.
- Database/Auth/Storage/Realtime: Supabase.
- Durable workflows: Inngest Cloud.
- Gmail push: Google Cloud Pub/Sub.
- Optional telemetry: set `OTEL_EXPORTER_OTLP_ENDPOINT`; no exporter is required for local operation.

See [architecture](docs/architecture.md), [security model](docs/threat-model.md), [connector operations](docs/connectors.md), and [P2 contracts](docs/p2-extension-contracts.md).
