-- Additive persistent source-intake and evidence workbench contracts.

alter table public.sources
  add column expected_sha256 text,
  add column expected_size_bytes bigint,
  add column expected_mime_type text,
  add column actual_sha256 text,
  add column actual_size_bytes bigint,
  add column actual_mime_type text,
  add column acknowledged_internal_non_regulated boolean not null default false,
  add column ai_processing_consent boolean not null default false,
  add column consented_at timestamptz,
  add column completed_at timestamptz,
  add column failure_code text,
  add column updated_at timestamptz not null default now();

update public.sources
set status = case when status = 'pending' then 'failed' else status end,
    failure_code = case when status = 'pending' then 'legacy_unverified' else failure_code end;

alter table public.sources alter column status set default 'awaiting_upload';
alter table public.sources add constraint sources_status_check check (
  status in (
    'awaiting_upload', 'validating', 'queued', 'parsing', 'requires_ocr',
    'extracting', 'review_ready', 'completed', 'failed', 'purged', 'ready'
  )
);
alter table public.sources add constraint sources_expected_sha256_check check (
  expected_sha256 is null or expected_sha256 ~ '^[a-f0-9]{64}$'
);
alter table public.sources add constraint sources_actual_sha256_check check (
  actual_sha256 is null or actual_sha256 ~ '^[a-f0-9]{64}$'
);
alter table public.sources add constraint sources_size_check check (
  (expected_size_bytes is null or expected_size_bytes between 1 and 26214400)
  and (actual_size_bytes is null or actual_size_bytes between 0 and 26214400)
);
alter table public.sources add constraint sources_upload_contract_check check (
  storage_path is null
  or status in ('ready', 'failed', 'purged')
  or (
    expected_sha256 is not null
    and expected_size_bytes is not null
    and expected_mime_type is not null
    and acknowledged_internal_non_regulated
    and ai_processing_consent
    and consented_at is not null
  )
);

alter table public.source_items
  add column locator_version integer not null default 1 check (locator_version > 0);

create table public.provider_credentials (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  provider text not null,
  status text not null check (status in ('active', 'expired', 'revoked', 'error')),
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  key_version integer not null check (key_version > 0),
  secret_suffix text not null check (char_length(secret_suffix) between 2 and 12),
  scopes text[] not null default '{}',
  expires_at timestamptz,
  last_validated_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, provider)
);

create table public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  status text not null check (status in ('queued', 'running', 'requires_ocr', 'completed', 'failed')),
  parser_version text not null,
  item_count integer not null default 0 check (item_count >= 0),
  warnings text[] not null default '{}',
  error_code text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.evidence_candidates (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  ingestion_run_id uuid not null references public.ingestion_runs(id) on delete cascade,
  source_item_id uuid not null references public.source_items(id) on delete restrict,
  claim_key text not null,
  claim text not null,
  value jsonb,
  payload_version integer not null default 1 check (payload_version > 0),
  unit text,
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  source_locator jsonb not null,
  locator_version integer not null default 1 check (locator_version > 0),
  status text not null default 'pending' check (
    status in ('pending', 'accepted', 'edited', 'rejected', 'conflicted')
  ),
  created_at timestamptz not null default now()
);

create table public.evidence_reviews (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  candidate_id uuid not null references public.evidence_candidates(id) on delete restrict,
  decision text not null check (decision in ('accepted', 'edited', 'rejected')),
  rationale text not null,
  edited_value jsonb,
  payload_version integer not null default 1 check (payload_version > 0),
  resulting_evidence_id uuid references public.evidence(id) on delete restrict,
  reviewed_by uuid not null references auth.users(id),
  reviewed_at timestamptz not null default now(),
  unique (candidate_id)
);

create table public.opportunity_drafts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  title text not null,
  problem_statement text not null,
  business_unit text,
  evidence_ids uuid[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'merged', 'rejected', 'promoted')),
  version integer not null default 1 check (version > 0),
  promoted_use_case_id uuid references public.use_cases(id) on delete restrict,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.execution_receipts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  operation text not null,
  object_type text not null,
  object_id uuid not null,
  status text not null check (status in ('succeeded', 'failed')),
  idempotency_key text,
  external_id text,
  created_at timestamptz not null default now(),
  unique (organisation_id, operation, idempotency_key)
);

create index sources_org_status_created_idx
  on public.sources (organisation_id, status, created_at desc);
create unique index sources_org_storage_path_idx
  on public.sources (organisation_id, storage_path) where storage_path is not null;
create index source_items_org_source_idx
  on public.source_items (organisation_id, source_id, created_at);
create index ingestion_runs_org_status_idx
  on public.ingestion_runs (organisation_id, status, created_at desc);
create index evidence_candidates_org_status_idx
  on public.evidence_candidates (organisation_id, status, created_at desc);
create index evidence_candidates_claim_idx
  on public.evidence_candidates (organisation_id, claim_key);
create index evidence_reviews_org_reviewed_idx
  on public.evidence_reviews (organisation_id, reviewed_at desc);
create index opportunity_drafts_org_status_idx
  on public.opportunity_drafts (organisation_id, status, updated_at desc);
create index execution_receipts_org_object_idx
  on public.execution_receipts (organisation_id, object_type, object_id, created_at desc);

alter table public.provider_credentials enable row level security;
alter table public.ingestion_runs enable row level security;
alter table public.evidence_candidates enable row level security;
alter table public.evidence_reviews enable row level security;
alter table public.opportunity_drafts enable row level security;
alter table public.execution_receipts enable row level security;

create policy provider_credentials_owner_insert on public.provider_credentials
  for insert with check (
    public.has_org_role(organisation_id, array['owner']::public.app_role[])
  );
create policy provider_credentials_owner_update on public.provider_credentials
  for update using (
    public.has_org_role(organisation_id, array['owner']::public.app_role[])
  ) with check (
    public.has_org_role(organisation_id, array['owner']::public.app_role[])
  );
create policy provider_credentials_owner_delete on public.provider_credentials
  for delete using (
    public.has_org_role(organisation_id, array['owner']::public.app_role[])
  );

create policy ingestion_runs_read on public.ingestion_runs
  for select using (public.is_org_member(organisation_id));
create policy ingestion_runs_write on public.ingestion_runs
  for all using (
    public.has_org_role(organisation_id, array['owner','admin','transformation_lead','analyst']::public.app_role[])
  ) with check (
    public.has_org_role(organisation_id, array['owner','admin','transformation_lead','analyst']::public.app_role[])
  );
create policy evidence_candidates_read on public.evidence_candidates
  for select using (public.is_org_member(organisation_id));
create policy evidence_candidates_write on public.evidence_candidates
  for all using (
    public.has_org_role(organisation_id, array['owner','admin','transformation_lead','analyst']::public.app_role[])
  ) with check (
    public.has_org_role(organisation_id, array['owner','admin','transformation_lead','analyst']::public.app_role[])
  );
create policy evidence_reviews_read on public.evidence_reviews
  for select using (public.is_org_member(organisation_id));
create policy evidence_reviews_insert on public.evidence_reviews
  for insert with check (
    public.has_org_role(organisation_id, array['owner','admin','transformation_lead','analyst']::public.app_role[])
  );
create policy opportunity_drafts_read on public.opportunity_drafts
  for select using (public.is_org_member(organisation_id));
create policy opportunity_drafts_write on public.opportunity_drafts
  for all using (
    public.has_org_role(organisation_id, array['owner','admin','transformation_lead','analyst']::public.app_role[])
  ) with check (
    public.has_org_role(organisation_id, array['owner','admin','transformation_lead','analyst']::public.app_role[])
  );
create policy execution_receipts_read on public.execution_receipts
  for select using (
    public.has_org_role(organisation_id, array['owner','admin','transformation_lead']::public.app_role[])
  );

drop policy tenant_write on public.sources;
create policy sources_insert on public.sources
  for insert with check (
    public.has_org_role(organisation_id, array['owner','admin','transformation_lead','analyst']::public.app_role[])
  );
create policy sources_update on public.sources
  for update using (
    public.has_org_role(organisation_id, array['owner','admin','transformation_lead','analyst']::public.app_role[])
  ) with check (
    public.has_org_role(organisation_id, array['owner','admin','transformation_lead','analyst']::public.app_role[])
  );
create policy sources_delete_owner on public.sources
  for delete using (
    public.has_org_role(organisation_id, array['owner']::public.app_role[])
  );

create trigger evidence_reviews_immutable
  before update or delete on public.evidence_reviews
  for each row execute function public.prevent_immutable_change();
create trigger execution_receipts_immutable
  before update or delete on public.execution_receipts
  for each row execute function public.prevent_immutable_change();

create function public.prevent_source_item_change()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  row_organisation_id uuid;
begin
  row_organisation_id := case when tg_op = 'DELETE' then old.organisation_id else new.organisation_id end;
  if current_setting('app.source_purge', true) = 'on'
     and (
       auth.role() = 'service_role'
       or public.has_org_role(row_organisation_id, array['owner']::public.app_role[])
     ) then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  raise exception 'Immutable source items cannot be updated or deleted';
end;
$$;

create trigger source_items_immutable
  before update or delete on public.source_items
  for each row execute function public.prevent_source_item_change();

create function public.audit_source_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into public.audit_events (
      organisation_id, actor_id, actor_type, action, target_type, target_id, metadata
    ) values (
      new.organisation_id,
      auth.uid(),
      case when auth.uid() is null then 'service' else 'user' end,
      case when tg_op = 'INSERT' then 'source.created' else 'source.status_changed' end,
      'source',
      new.id::text,
      jsonb_build_object(
        'version', 1,
        'from_status', case when tg_op = 'INSERT' then null else old.status end,
        'to_status', new.status
      )
    );
  end if;
  return new;
end;
$$;

create trigger source_lifecycle_audit
  after insert or update of status on public.sources
  for each row execute function public.audit_source_lifecycle();

create or replace function public.storage_object_organisation_id(object_name text)
returns uuid
language plpgsql
immutable
set search_path = public, storage
as $$
declare
  first_segment text;
begin
  first_segment := (storage.foldername(object_name))[1];
  if first_segment is null or first_segment !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return null;
  end if;
  return first_segment::uuid;
end;
$$;

drop policy source_files_read on storage.objects;
drop policy source_files_write on storage.objects;
create policy source_files_read on storage.objects for select using (
  bucket_id = 'enterprise-sources'
  and public.is_org_member(public.storage_object_organisation_id(name))
);
create policy source_files_write on storage.objects for insert with check (
  bucket_id = 'enterprise-sources'
  and public.has_org_role(
    public.storage_object_organisation_id(name),
    array['owner','admin','transformation_lead','analyst']::public.app_role[]
  )
);
create policy source_files_delete_owner on storage.objects for delete using (
  bucket_id = 'enterprise-sources'
  and public.has_org_role(
    public.storage_object_organisation_id(name),
    array['owner']::public.app_role[]
  )
);

create function public.complete_source_upload(
  target_organisation_id uuid,
  target_source_id uuid,
  completion_payload jsonb
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  source_row public.sources%rowtype;
  updated_source public.sources%rowtype;
  item jsonb;
  run_payload jsonb;
begin
  select * into source_row
  from public.sources
  where id = target_source_id and organisation_id = target_organisation_id
  for update;

  if not found then return null; end if;
  if completion_payload->>'version' <> '1' then
    raise exception 'Unsupported completion payload version';
  end if;
  if source_row.status <> 'parsing' then
    return jsonb_build_object('source', to_jsonb(source_row), 'replayed', true);
  end if;
  if not source_row.acknowledged_internal_non_regulated or not source_row.ai_processing_consent then
    raise exception 'Source consent is required';
  end if;
  if completion_payload->'source'->>'status' not in ('queued', 'requires_ocr') then
    raise exception 'Invalid completion status';
  end if;
  if completion_payload->'source'->>'actual_sha256' is distinct from source_row.expected_sha256
     or (completion_payload->'source'->>'actual_size_bytes')::bigint is distinct from source_row.expected_size_bytes
     or completion_payload->'source'->>'actual_mime_type' is distinct from source_row.expected_mime_type then
    raise exception 'Completed upload does not match the expected hash, size, and MIME type';
  end if;

  for item in select value from jsonb_array_elements(completion_payload->'items')
  loop
    if item->>'organisation_id' <> target_organisation_id::text
       or item->>'source_id' <> target_source_id::text then
      raise exception 'Source item tenant boundary violation';
    end if;
    insert into public.source_items (
      id, organisation_id, source_id, content, content_hash,
      source_locator, locator_version, metadata, created_at
    ) values (
      (item->>'id')::uuid,
      target_organisation_id,
      target_source_id,
      item->>'content',
      item->>'content_hash',
      item->'source_locator',
      1,
      jsonb_build_object('version', 1),
      (item->>'created_at')::timestamptz
    );
  end loop;

  run_payload := completion_payload->'run';
  if run_payload->>'organisation_id' <> target_organisation_id::text
     or run_payload->>'source_id' <> target_source_id::text then
    raise exception 'Ingestion run tenant boundary violation';
  end if;
  insert into public.ingestion_runs (
    id, organisation_id, source_id, status, parser_version, item_count,
    error_code, started_at, completed_at, created_at
  ) values (
    (run_payload->>'id')::uuid,
    target_organisation_id,
    target_source_id,
    run_payload->>'status',
    run_payload->>'parser_version',
    (run_payload->>'item_count')::integer,
    run_payload->>'error_code',
    (run_payload->>'started_at')::timestamptz,
    (run_payload->>'completed_at')::timestamptz,
    (run_payload->>'created_at')::timestamptz
  );

  update public.sources
  set status = completion_payload->'source'->>'status',
      actual_sha256 = completion_payload->'source'->>'actual_sha256',
      actual_size_bytes = (completion_payload->'source'->>'actual_size_bytes')::bigint,
      actual_mime_type = completion_payload->'source'->>'actual_mime_type',
      completed_at = (completion_payload->'source'->>'completed_at')::timestamptz,
      updated_at = now()
  where id = target_source_id and organisation_id = target_organisation_id
  returning * into updated_source;

  return jsonb_build_object('source', to_jsonb(updated_source), 'replayed', false);
end;
$$;

create function public.purge_source(
  target_organisation_id uuid,
  target_source_id uuid,
  receipt_id uuid,
  receipt_created_at timestamptz
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  source_row public.sources%rowtype;
  receipt_row public.execution_receipts%rowtype;
begin
  select * into source_row
  from public.sources
  where id = target_source_id and organisation_id = target_organisation_id
  for update;
  if not found then return null; end if;

  if auth.role() <> 'service_role'
     and not public.has_org_role(target_organisation_id, array['owner']::public.app_role[]) then
    raise exception 'Owner role required' using errcode = '42501';
  end if;

  perform set_config('app.source_purge', 'on', true);
  update public.source_items
  set content = '',
      content_hash = encode(digest('', 'sha256'), 'hex'),
      source_locator = jsonb_build_object(
        'type', 'text_line', 'startLine', 1, 'endLine', 1
      ),
      metadata = jsonb_build_object('version', 1, 'purged', true)
  where organisation_id = target_organisation_id and source_id = target_source_id;

  update public.sources
  set name = '[purged]',
      storage_path = null,
      status = 'purged',
      expected_sha256 = null,
      expected_size_bytes = null,
      expected_mime_type = null,
      actual_sha256 = null,
      actual_size_bytes = null,
      actual_mime_type = null,
      metadata = jsonb_build_object('version', 1, 'purged', true),
      completed_at = coalesce(completed_at, receipt_created_at),
      updated_at = receipt_created_at
  where id = target_source_id and organisation_id = target_organisation_id;

  insert into public.execution_receipts (
    id, organisation_id, operation, object_type, object_id, status, created_at
  ) values (
    receipt_id, target_organisation_id, 'source.purged', 'source',
    target_source_id, 'succeeded', receipt_created_at
  ) returning * into receipt_row;

  return to_jsonb(receipt_row);
end;
$$;

revoke all on function public.complete_source_upload(uuid, uuid, jsonb) from public;
grant execute on function public.complete_source_upload(uuid, uuid, jsonb) to authenticated, service_role;
revoke all on function public.purge_source(uuid, uuid, uuid, timestamptz) from public;
grant execute on function public.purge_source(uuid, uuid, uuid, timestamptz) to authenticated, service_role;
