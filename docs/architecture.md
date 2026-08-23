# Architecture

## Production topology

The platform is a modular monolith: one deployable Next.js application with strict domain boundaries and durable background execution. Postgres is the system of record; JSONB is limited to versioned schemas, immutable payload snapshots, structured model output, and connector metadata.

```mermaid
flowchart LR
  U[Executive / analyst / approver] --> V[Vercel · Next.js App Router]
  V --> S[Supabase Auth + RLS Postgres]
  V --> B[Private Supabase Storage]
  V --> I[Inngest Cloud]
  I --> S
  I --> O[OpenAI Responses API]
  I --> G[Google Workspace APIs]
  GP[Google Pub/Sub] --> V
  GC[Calendar push channels] --> V
  S -. Realtime .-> V
  V -. optional OTLP .-> T[Telemetry collector]
```

## Domain boundaries

```mermaid
flowchart TB
  Evidence[Evidence + ingestion] --> Opportunity[Opportunity mining]
  Opportunity --> Portfolio[Portfolio scoring]
  Evidence --> Workflow[Current / future workflow twin]
  Portfolio --> Economics[Financial + simulation engines]
  Workflow --> Committee[Specialist committee]
  Economics --> Committee
  Evidence --> Committee
  Committee --> Decision[Policy-constrained decision]
  Decision --> Blueprint[Agent blueprint + autonomy policy]
  Blueprint --> Pilot[90-day pilot]
  Pilot --> Value[Measurements + realised value]
  Value --> Steering[Briefs + steering packs]
  Decision --> Approval[Immutable approval revision]
  Approval --> Connector[Exact external execution]
```

Deterministic services own arithmetic, scoring, classifications, consensus, policy gates, scenario application, and value recommendations. Agents extract, interpret, challenge, redesign, and draft; they do not replace deterministic calculation or the human decision.

## Evidence ingestion

```mermaid
sequenceDiagram
  participant User
  participant API as Upload API
  participant Parser as Isolated parser
  participant Job as Inngest
  participant Miner as Opportunity Miner
  participant DB as Evidence ledger
  User->>API: PDF / DOCX / XLSX / CSV / TXT / MD
  API->>Parser: bytes + file name
  Parser-->>API: items + page/sheet/row/line locators
  alt low-text PDF
    Parser-->>API: requiresOcr = true
  else usable text
    API->>Job: signed organisation event
    Job->>Miner: untrusted data, no action tools
    Miner-->>Job: Zod-constrained draft + evidence refs
    Job->>DB: organisation-scoped records
  end
```

## Approval execution

```mermaid
sequenceDiagram
  participant Agent
  participant Policy
  participant Approver
  participant DB
  participant Job as Inngest
  participant Provider
  Agent->>Policy: action proposal
  Policy-->>DB: pending approval + immutable revision
  Approver->>DB: decision(id, revision)
  DB-->>Job: organisation, payload hash, idempotency key
  Job->>Job: verify actor, version, expiry, policy, hash
  Job->>Provider: exact reviewed payload
  Provider-->>DB: execution receipt
```

Editing never mutates the reviewed payload; it creates a new approval revision. Gmail content approval creates a draft. Sending requires a new `gmail.send` approval.

## Tenant boundary

Browser reads and writes use session-bound Supabase clients. RLS evaluates membership and role for each tenant table and the first private-storage path segment. Integration secrets have no authenticated-client read policy. Background code may construct a service client only after a verified request, OAuth callback, or signed Inngest event provides an organisation context.

## Repository map

- `src/app`: routes and API boundaries.
- `src/modules`: domain logic, UI, agents, integrations, exports, and deterministic engines.
- `src/inngest`: durable functions.
- `src/config`: versioned model routing and cost configuration.
- `src/lib/domain`: stable public contracts.
- `supabase/migrations`: relational schema, RLS, storage policies, and immutability triggers.
- `supabase/tests`: pgTAP isolation checks.
- `tests/e2e`: executive, governance, responsive, and accessibility journeys.
