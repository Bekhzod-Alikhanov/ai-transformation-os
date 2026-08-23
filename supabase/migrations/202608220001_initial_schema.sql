create extension if not exists pgcrypto;

create type public.app_role as enum ('owner', 'admin', 'transformation_lead', 'analyst', 'approver', 'viewer');
create type public.provenance_kind as enum ('observed', 'user_provided', 'ai_inferred', 'assumed', 'calculated');
create type public.approval_status as enum ('pending', 'approved', 'executing', 'executed', 'rejected', 'expired', 'failed');
create type public.run_status as enum ('queued', 'running', 'requires_approval', 'completed', 'failed', 'cancelled');

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.organisation_memberships (
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (organisation_id, user_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  email text not null,
  role public.app_role not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  provider text not null,
  status text not null check (status in ('available', 'connected', 'error', 'disabled', 'adapter')),
  scopes text[] not null default '{}',
  metadata jsonb not null default '{}',
  connected_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, provider)
);

create table public.integration_secrets (
  integration_id uuid primary key references public.integrations(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  key_version integer not null,
  updated_at timestamptz not null default now()
);

create table public.connector_sync_states (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  integration_id uuid not null references public.integrations(id) on delete cascade,
  resource text not null,
  cursor text,
  channel_id text,
  channel_expiration timestamptz,
  last_success_at timestamptz,
  last_error text,
  unique (integration_id, resource)
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  integration_id uuid references public.integrations(id) on delete set null,
  kind text not null,
  name text not null,
  synthetic boolean not null default false,
  storage_path text,
  status text not null default 'pending',
  metadata jsonb not null default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.source_items (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  external_id text,
  title text,
  content text,
  content_hash text not null,
  source_locator jsonb not null default '{}',
  occurred_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (source_id, content_hash)
);

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  source_item_id uuid references public.source_items(id) on delete restrict,
  claim_key text not null,
  claim text not null,
  value jsonb,
  unit text,
  provenance public.provenance_kind not null,
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  source_locator jsonb,
  extraction_method text,
  valid_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (provenance <> 'observed' or (source_item_id is not null and source_locator is not null))
);

create table public.use_cases (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  slug text not null,
  title text not null,
  business_unit text not null,
  problem_statement text not null,
  summary text,
  owner_id uuid references auth.users(id),
  status text not null,
  classification text not null,
  expected_annual_value numeric(16,2),
  confidence numeric(4,3) check (confidence between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, slug)
);

create table public.evidence_links (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  evidence_id uuid not null references public.evidence(id) on delete cascade,
  use_case_id uuid references public.use_cases(id) on delete cascade,
  relationship text not null default 'supports',
  unique (evidence_id, use_case_id, relationship)
);

create table public.use_case_scores (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  use_case_id uuid not null references public.use_cases(id) on delete cascade,
  version integer not null,
  weights jsonb not null,
  dimensions jsonb not null,
  overall_score numeric(6,2) not null,
  evidence_coverage numeric(4,3) not null,
  classification text not null,
  created_at timestamptz not null default now(),
  unique (use_case_id, version)
);

create table public.assumptions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  use_case_id uuid not null references public.use_cases(id) on delete cascade,
  key text not null,
  label text not null,
  value jsonb not null,
  unit text,
  provenance public.provenance_kind not null,
  confidence numeric(4,3) not null,
  evidence_id uuid references public.evidence(id),
  version integer not null default 1,
  created_at timestamptz not null default now()
);

create table public.financial_models (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  use_case_id uuid not null references public.use_cases(id) on delete cascade,
  version integer not null,
  inputs jsonb not null,
  outputs jsonb not null,
  formulas jsonb not null,
  created_at timestamptz not null default now(),
  unique (use_case_id, version)
);

create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  use_case_id uuid references public.use_cases(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('conservative', 'base', 'upside', 'custom')),
  patch jsonb not null,
  results jsonb not null,
  seed integer,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  use_case_id uuid not null references public.use_cases(id) on delete cascade,
  state text not null check (state in ('current', 'future')),
  version integer not null,
  metrics jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (use_case_id, state, version)
);

create table public.workflow_nodes (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  node_key text not null,
  category text not null check (category in ('human', 'agent', 'automation', 'system', 'decision', 'control')),
  label text not null,
  position jsonb not null,
  metrics jsonb not null default '{}',
  unique (workflow_id, node_key)
);

create table public.workflow_edges (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  source_node_id uuid not null references public.workflow_nodes(id) on delete cascade,
  target_node_id uuid not null references public.workflow_nodes(id) on delete cascade,
  label text,
  condition jsonb
);

create table public.agent_blueprints (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  use_case_id uuid not null references public.use_cases(id) on delete cascade,
  version integer not null,
  autonomy_level text not null,
  graph jsonb not null,
  policy_matrix jsonb not null,
  created_at timestamptz not null default now(),
  unique (use_case_id, version)
);

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  blueprint_id uuid references public.agent_blueprints(id) on delete cascade,
  key text not null,
  name text not null,
  model text not null,
  instructions_version text not null,
  allowed_tools text[] not null default '{}',
  output_schema jsonb not null,
  guardrails jsonb not null default '{}'
);

create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  use_case_id uuid references public.use_cases(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  run_type text not null,
  mode text not null check (mode in ('live', 'synthetic_replay')),
  status public.run_status not null default 'queued',
  model text,
  input jsonb not null default '{}',
  output jsonb,
  evidence_ids uuid[] not null default '{}',
  input_tokens integer,
  output_tokens integer,
  estimated_cost numeric(12,6),
  started_at timestamptz,
  ended_at timestamptz,
  error_code text,
  created_at timestamptz not null default now()
);

create table public.agent_events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  sequence integer not null,
  event_type text not null,
  summary text not null,
  payload jsonb not null default '{}',
  occurred_at timestamptz not null default now(),
  unique (run_id, sequence)
);

create table public.pilots (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  use_case_id uuid not null references public.use_cases(id) on delete cascade,
  phase text not null check (phase in ('0-30', '31-60', '61-90', 'complete')),
  status text not null,
  plan jsonb not null,
  recommendation text,
  started_at date,
  review_at date,
  created_at timestamptz not null default now()
);

create table public.kpis (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  pilot_id uuid not null references public.pilots(id) on delete cascade,
  key text not null,
  label text not null,
  unit text not null,
  target numeric not null,
  direction text not null check (direction in ('increase', 'decrease')),
  unique (pilot_id, key)
);

create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  kpi_id uuid not null references public.kpis(id) on delete cascade,
  value numeric not null,
  measured_at timestamptz not null,
  evidence_id uuid references public.evidence(id),
  created_at timestamptz not null default now()
);

create table public.risks (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  use_case_id uuid references public.use_cases(id) on delete cascade,
  pilot_id uuid references public.pilots(id) on delete cascade,
  title text not null,
  severity text not null,
  likelihood text not null,
  status text not null,
  owner_id uuid references auth.users(id),
  evidence_ids uuid[] not null default '{}'
);

create table public.controls (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  risk_id uuid references public.risks(id) on delete cascade,
  use_case_id uuid references public.use_cases(id) on delete cascade,
  title text not null,
  control_type text not null,
  requirement text not null,
  status text not null,
  owner_id uuid references auth.users(id)
);

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  use_case_id uuid references public.use_cases(id) on delete cascade,
  decision text not null,
  model_recommendation text,
  human_decision text,
  rationale text,
  conditions jsonb not null default '[]',
  evidence_ids uuid[] not null default '{}',
  decision_maker uuid references auth.users(id),
  follow_up_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  action_type text not null,
  system text not null,
  status public.approval_status not null default 'pending',
  current_revision integer not null default 1,
  requester_agent_run_id uuid references public.agent_runs(id),
  requested_by uuid references auth.users(id),
  risk text not null,
  reason text not null,
  evidence_ids uuid[] not null default '{}',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.approval_revisions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  approval_id uuid not null references public.approvals(id) on delete cascade,
  revision integer not null,
  payload jsonb not null,
  payload_hash text not null,
  edited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (approval_id, revision)
);

create table public.automation_recipes (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  name text not null,
  enabled boolean not null default true,
  definition jsonb not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  recipe_id uuid not null references public.automation_recipes(id) on delete cascade,
  status public.run_status not null default 'queued',
  trigger_payload jsonb not null default '{}',
  result jsonb,
  started_at timestamptz,
  ended_at timestamptz
);

create table public.model_evaluations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  run_id uuid references public.agent_runs(id) on delete set null,
  dataset_version text not null,
  model text not null,
  routing_policy text not null,
  metrics jsonb not null,
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  actor_id uuid references auth.users(id),
  actor_type text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  payload_hash text,
  metadata jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);

create index on public.organisation_memberships (user_id, organisation_id);
create index on public.evidence (organisation_id, claim_key);
create index on public.use_cases (organisation_id, status, classification);
create index on public.agent_runs (organisation_id, created_at desc);
create index on public.agent_events (run_id, sequence);
create index on public.approvals (organisation_id, status, created_at desc);
create index on public.audit_events (organisation_id, occurred_at desc);

create function public.is_org_member(target_organisation_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.organisation_memberships membership
    where membership.organisation_id = target_organisation_id and membership.user_id = auth.uid()
  );
$$;

create function public.has_org_role(target_organisation_id uuid, allowed_roles public.app_role[])
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.organisation_memberships membership
    where membership.organisation_id = target_organisation_id
      and membership.user_id = auth.uid()
      and membership.role = any(allowed_roles)
  );
$$;

alter table public.organisations enable row level security;
alter table public.profiles enable row level security;
alter table public.organisation_memberships enable row level security;
alter table public.integration_secrets enable row level security;

create policy organisations_read on public.organisations for select using (public.is_org_member(id));
create policy memberships_read on public.organisation_memberships for select using (public.is_org_member(organisation_id));
create policy memberships_manage on public.organisation_memberships for all using (
  public.has_org_role(organisation_id, array['owner','admin']::public.app_role[])
) with check (public.has_org_role(organisation_id, array['owner','admin']::public.app_role[]));
create policy profiles_read on public.profiles for select using (
  exists (
    select 1 from public.organisation_memberships mine
    join public.organisation_memberships theirs on theirs.organisation_id = mine.organisation_id
    where mine.user_id = auth.uid() and theirs.user_id = profiles.id
  )
);
create policy profiles_update_self on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

do $$
declare tenant_table text;
begin
  foreach tenant_table in array array[
    'invitations','integrations','connector_sync_states','sources','source_items','evidence','evidence_links',
    'use_cases','use_case_scores','assumptions','financial_models','scenarios','workflows','workflow_nodes',
    'workflow_edges','agent_blueprints','agents','agent_runs','agent_events','pilots','kpis','measurements',
    'risks','controls','decisions','approvals','approval_revisions','automation_recipes','automation_runs',
    'model_evaluations','audit_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', tenant_table);
    execute format(
      'create policy tenant_read on public.%I for select using (public.is_org_member(organisation_id))',
      tenant_table
    );
  end loop;
end $$;

do $$
declare writable_table text;
begin
  foreach writable_table in array array[
    'invitations','integrations','connector_sync_states','sources','source_items','evidence','evidence_links',
    'use_cases','use_case_scores','assumptions','financial_models','scenarios','workflows','workflow_nodes',
    'workflow_edges','agent_blueprints','agents','agent_runs','agent_events','pilots','kpis','measurements',
    'risks','controls','decisions','automation_recipes','automation_runs','model_evaluations'
  ]
  loop
    execute format(
      'create policy tenant_write on public.%I for all using (public.has_org_role(organisation_id, array[''owner'',''admin'',''transformation_lead'',''analyst'']::public.app_role[])) with check (public.has_org_role(organisation_id, array[''owner'',''admin'',''transformation_lead'',''analyst'']::public.app_role[]))',
      writable_table
    );
  end loop;
end $$;

create policy approvals_insert on public.approvals for insert with check (
  public.has_org_role(organisation_id, array['owner','admin','transformation_lead','approver']::public.app_role[])
);
create policy approvals_decide on public.approvals for update using (
  public.has_org_role(organisation_id, array['owner','admin','approver']::public.app_role[])
) with check (public.has_org_role(organisation_id, array['owner','admin','approver']::public.app_role[]));
create policy approval_revisions_insert on public.approval_revisions for insert with check (
  public.has_org_role(organisation_id, array['owner','admin','approver']::public.app_role[])
);
alter policy tenant_read on public.audit_events using (
  public.has_org_role(organisation_id, array['owner','admin','transformation_lead']::public.app_role[])
);
create policy audit_read_leads on public.audit_events for select using (
  public.has_org_role(organisation_id, array['owner','admin','transformation_lead']::public.app_role[])
);

create function public.prevent_immutable_change()
returns trigger language plpgsql as $$
begin
  raise exception 'Immutable records cannot be updated or deleted';
end;
$$;

create trigger evidence_immutable before update or delete on public.evidence
for each row execute function public.prevent_immutable_change();
create trigger approval_revisions_immutable before update or delete on public.approval_revisions
for each row execute function public.prevent_immutable_change();
create trigger audit_events_immutable before update or delete on public.audit_events
for each row execute function public.prevent_immutable_change();

insert into storage.buckets (id, name, public)
values ('enterprise-sources', 'enterprise-sources', false)
on conflict (id) do nothing;

create policy source_files_read on storage.objects for select using (
  bucket_id = 'enterprise-sources'
  and public.is_org_member(((storage.foldername(name))[1])::uuid)
);
create policy source_files_write on storage.objects for insert with check (
  bucket_id = 'enterprise-sources'
  and public.has_org_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner','admin','transformation_lead','analyst']::public.app_role[]
  )
);
