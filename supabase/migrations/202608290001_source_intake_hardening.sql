-- Review hardening: trusted lifecycle writes, tenant-bound references, durable runs and destructive purge.

drop policy if exists sources_update on public.sources;
drop policy if exists sources_delete_owner on public.sources;
drop policy if exists ingestion_runs_write on public.ingestion_runs;
drop policy if exists evidence_candidates_write on public.evidence_candidates;
create policy evidence_candidates_insert on public.evidence_candidates for insert with check (
  status = 'pending' and public.has_org_role(organisation_id, array['owner','admin','transformation_lead','analyst']::public.app_role[])
);
drop policy if exists sources_insert on public.sources;
create policy sources_insert on public.sources for insert with check (
  status = 'awaiting_upload' and public.has_org_role(organisation_id, array['owner','admin','transformation_lead','analyst']::public.app_role[])
);

revoke execute on function public.complete_source_upload(uuid, uuid, jsonb) from authenticated;
revoke execute on function public.purge_source(uuid, uuid, uuid, timestamptz) from authenticated;
grant execute on function public.complete_source_upload(uuid, uuid, jsonb) to service_role;
grant execute on function public.purge_source(uuid, uuid, uuid, timestamptz) to service_role;

alter table public.sources add constraint sources_organisation_id_id_key unique (organisation_id, id);
alter table public.source_items add constraint source_items_organisation_id_id_key unique (organisation_id, id);
alter table public.ingestion_runs add constraint ingestion_runs_organisation_id_id_key unique (organisation_id, id);
alter table public.evidence_candidates add constraint evidence_candidates_organisation_id_id_key unique (organisation_id, id);
alter table public.evidence add constraint evidence_organisation_id_id_key unique (organisation_id, id);
alter table public.use_cases add constraint use_cases_organisation_id_id_key unique (organisation_id, id);
alter table public.agent_runs add constraint agent_runs_organisation_id_id_key unique (organisation_id, id);
alter table public.approvals add constraint approvals_organisation_id_id_key unique (organisation_id, id);
alter table public.opportunity_drafts add constraint opportunity_drafts_organisation_id_id_key unique (organisation_id, id);

alter table public.source_items drop constraint source_items_source_id_fkey;
alter table public.source_items add constraint source_items_org_source_fkey foreign key (organisation_id, source_id)
  references public.sources (organisation_id, id) on delete cascade;
alter table public.ingestion_runs drop constraint ingestion_runs_source_id_fkey;
alter table public.ingestion_runs add constraint ingestion_runs_org_source_fkey foreign key (organisation_id, source_id)
  references public.sources (organisation_id, id) on delete cascade;
alter table public.evidence_candidates drop constraint evidence_candidates_ingestion_run_id_fkey;
alter table public.evidence_candidates add constraint evidence_candidates_org_run_fkey foreign key (organisation_id, ingestion_run_id)
  references public.ingestion_runs (organisation_id, id) on delete cascade;
alter table public.evidence_candidates drop constraint evidence_candidates_source_item_id_fkey;
alter table public.evidence_candidates add constraint evidence_candidates_org_item_fkey foreign key (organisation_id, source_item_id)
  references public.source_items (organisation_id, id) on delete restrict;
alter table public.evidence_reviews drop constraint evidence_reviews_candidate_id_fkey;
alter table public.evidence_reviews add constraint evidence_reviews_org_candidate_fkey foreign key (organisation_id, candidate_id)
  references public.evidence_candidates (organisation_id, id) on delete restrict;
alter table public.evidence_reviews drop constraint evidence_reviews_resulting_evidence_id_fkey;
alter table public.evidence_reviews add constraint evidence_reviews_org_evidence_fkey foreign key (organisation_id, resulting_evidence_id)
  references public.evidence (organisation_id, id) on delete restrict;
alter table public.evidence drop constraint evidence_source_item_id_fkey;
alter table public.evidence add constraint evidence_org_source_item_fkey foreign key (organisation_id, source_item_id)
  references public.source_items (organisation_id, id) on delete restrict;
alter table public.evidence_links drop constraint evidence_links_evidence_id_fkey;
alter table public.evidence_links add constraint evidence_links_org_evidence_fkey foreign key (organisation_id,evidence_id)
  references public.evidence(organisation_id,id) on delete cascade;
alter table public.evidence_links drop constraint evidence_links_use_case_id_fkey;
alter table public.evidence_links add constraint evidence_links_org_use_case_fkey foreign key (organisation_id,use_case_id)
  references public.use_cases(organisation_id,id) on delete cascade;
alter table public.agent_runs drop constraint agent_runs_use_case_id_fkey;
alter table public.agent_runs add constraint agent_runs_org_use_case_fkey foreign key (organisation_id,use_case_id)
  references public.use_cases(organisation_id,id) on delete cascade;
alter table public.agent_events drop constraint agent_events_run_id_fkey;
alter table public.agent_events add constraint agent_events_org_run_fkey foreign key (organisation_id,run_id)
  references public.agent_runs(organisation_id,id) on delete cascade;
alter table public.approvals drop constraint approvals_requester_agent_run_id_fkey;
alter table public.approvals add constraint approvals_org_run_fkey foreign key (organisation_id,requester_agent_run_id)
  references public.agent_runs(organisation_id,id);
alter table public.approval_revisions drop constraint approval_revisions_approval_id_fkey;
alter table public.approval_revisions add constraint approval_revisions_org_approval_fkey foreign key (organisation_id,approval_id)
  references public.approvals(organisation_id,id) on delete cascade;
alter table public.opportunity_drafts drop constraint opportunity_drafts_promoted_use_case_id_fkey;
alter table public.opportunity_drafts add constraint opportunity_drafts_org_use_case_fkey foreign key (organisation_id, promoted_use_case_id)
  references public.use_cases (organisation_id, id) on delete restrict;

create table public.opportunity_draft_evidence (
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  opportunity_draft_id uuid not null,
  evidence_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (opportunity_draft_id, evidence_id),
  foreign key (organisation_id, opportunity_draft_id) references public.opportunity_drafts(organisation_id,id) on delete cascade,
  foreign key (organisation_id, evidence_id) references public.evidence(organisation_id,id) on delete restrict
);
alter table public.opportunity_draft_evidence enable row level security;
create policy opportunity_draft_evidence_read on public.opportunity_draft_evidence for select using (public.is_org_member(organisation_id));
create policy opportunity_draft_evidence_write on public.opportunity_draft_evidence for all using (
  public.has_org_role(organisation_id, array['owner','admin','transformation_lead','analyst']::public.app_role[])
) with check (public.has_org_role(organisation_id, array['owner','admin','transformation_lead','analyst']::public.app_role[]));
alter table public.opportunity_drafts drop column evidence_ids;

update public.execution_receipts set idempotency_key = 'legacy-receipt:' || id where idempotency_key is null;
alter table public.execution_receipts alter column idempotency_key set not null;

create or replace function public.prevent_candidate_terminal_change() returns trigger language plpgsql set search_path=public as $$
begin
  if current_setting('app.source_purge', true) = 'on' and auth.role() = 'service_role' then return case when tg_op='DELETE' then old else new end; end if;
  if tg_op='DELETE' or old.status in ('accepted','edited','rejected') then raise exception 'Terminal evidence candidates are immutable'; end if;
  if auth.role() <> 'service_role' or old.status <> 'pending' or new.status not in ('accepted','edited','rejected') then
    raise exception 'Candidate review transition requires trusted service';
  end if;
  return new;
end $$;
create trigger evidence_candidates_terminal_immutable before update or delete on public.evidence_candidates
for each row execute function public.prevent_candidate_terminal_change();

create or replace function public.prevent_purgeable_immutable_change() returns trigger language plpgsql set search_path=public as $$
begin
  if current_setting('app.source_purge', true)='on' and auth.role()='service_role' then return case when tg_op='DELETE' then old else new end; end if;
  raise exception 'Immutable records cannot be updated or deleted';
end $$;
drop trigger evidence_reviews_immutable on public.evidence_reviews;
create trigger evidence_reviews_immutable before update or delete on public.evidence_reviews for each row execute function public.prevent_purgeable_immutable_change();
drop trigger evidence_immutable on public.evidence;
create trigger evidence_immutable before update or delete on public.evidence for each row execute function public.prevent_purgeable_immutable_change();

create function public.delete_awaiting_source(target_organisation_id uuid, target_source_id uuid) returns boolean
language plpgsql security definer set search_path=public as $$ begin
  if auth.role() <> 'service_role' then raise exception 'Trusted service required' using errcode='42501'; end if;
  delete from public.sources where organisation_id=target_organisation_id and id=target_source_id and status='awaiting_upload';
  return found;
end $$;

create function public.begin_source_ingestion(target_organisation_id uuid, target_source_id uuid, run_payload jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$ declare r public.ingestion_runs%rowtype; begin
  if auth.role() <> 'service_role' then raise exception 'Trusted service required' using errcode='42501'; end if;
  if run_payload->>'organisation_id' <> target_organisation_id::text or run_payload->>'source_id' <> target_source_id::text then raise exception 'Run tenant boundary violation'; end if;
  perform 1 from public.sources where organisation_id=target_organisation_id and id=target_source_id for update;
  if not found then return null; end if;
  select * into r from public.ingestion_runs where organisation_id=target_organisation_id and source_id=target_source_id and status='running' order by created_at desc limit 1;
  if found then return to_jsonb(r); end if;
  insert into public.ingestion_runs(id,organisation_id,source_id,status,parser_version,item_count,error_code,started_at,completed_at,created_at)
  values ((run_payload->>'id')::uuid,target_organisation_id,target_source_id,'running',run_payload->>'parser_version',0,null,(run_payload->>'started_at')::timestamptz,null,(run_payload->>'created_at')::timestamptz)
  returning * into r;
  return to_jsonb(r);
end $$;

create function public.fail_source_ingestion(target_organisation_id uuid,target_source_id uuid,target_run_id uuid,failure_code text) returns jsonb
language plpgsql security definer set search_path=public as $$ declare s public.sources%rowtype; begin
  if auth.role() <> 'service_role' then raise exception 'Trusted service required' using errcode='42501'; end if;
  update public.ingestion_runs set status='failed',error_code=failure_code,completed_at=now()
    where organisation_id=target_organisation_id and id=target_run_id and source_id=target_source_id;
  update public.sources set status='failed',failure_code=fail_source_ingestion.failure_code,updated_at=now()
    where organisation_id=target_organisation_id and id=target_source_id returning * into s;
  return to_jsonb(s);
end $$;

create function public.find_source_purge_receipt(target_organisation_id uuid,target_source_id uuid) returns jsonb
language sql security definer stable set search_path=public as $$
  select to_jsonb(r) from public.execution_receipts r where r.organisation_id=target_organisation_id and r.operation='source.purged'
  and r.idempotency_key='source-purge:'||target_organisation_id::text||':'||target_source_id::text limit 1
$$;

revoke all on function public.delete_awaiting_source(uuid,uuid) from public,authenticated;
revoke all on function public.begin_source_ingestion(uuid,uuid,jsonb) from public,authenticated;
revoke all on function public.fail_source_ingestion(uuid,uuid,uuid,text) from public,authenticated;
revoke all on function public.find_source_purge_receipt(uuid,uuid) from public,authenticated;
grant execute on function public.delete_awaiting_source(uuid,uuid) to service_role;
grant execute on function public.begin_source_ingestion(uuid,uuid,jsonb) to service_role;
grant execute on function public.fail_source_ingestion(uuid,uuid,uuid,text) to service_role;
grant execute on function public.find_source_purge_receipt(uuid,uuid) to service_role;

create or replace function public.complete_source_upload(target_organisation_id uuid,target_source_id uuid,completion_payload jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$ declare s public.sources%rowtype; updated public.sources%rowtype; item jsonb; rp jsonb; begin
  if auth.role()<>'service_role' then raise exception 'Trusted service required' using errcode='42501'; end if;
  select * into s from public.sources where id=target_source_id and organisation_id=target_organisation_id for update;
  if not found then return null; end if;
  if s.status<>'parsing' then return jsonb_build_object('source',to_jsonb(s),'replayed',true); end if;
  if completion_payload->>'version'<>'1' then raise exception 'Unsupported completion payload version'; end if;
  if completion_payload->'source'->>'status' not in ('queued','requires_ocr') then raise exception 'Invalid completion status'; end if;
  if completion_payload->'source'->>'actual_sha256' is distinct from s.expected_sha256 or (completion_payload->'source'->>'actual_size_bytes')::bigint is distinct from s.expected_size_bytes or completion_payload->'source'->>'actual_mime_type' is distinct from s.expected_mime_type then raise exception 'Upload contract mismatch'; end if;
  for item in select value from jsonb_array_elements(completion_payload->'items') loop
    if item->>'organisation_id'<>target_organisation_id::text or item->>'source_id'<>target_source_id::text then raise exception 'Source item tenant boundary violation'; end if;
    insert into public.source_items(id,organisation_id,source_id,content,content_hash,source_locator,locator_version,metadata,created_at)
    values((item->>'id')::uuid,target_organisation_id,target_source_id,item->>'content',item->>'content_hash',item->'source_locator',1,'{"version":1}'::jsonb,(item->>'created_at')::timestamptz);
  end loop;
  rp:=completion_payload->'run';
  update public.ingestion_runs set status=rp->>'status',item_count=(rp->>'item_count')::int,error_code=rp->>'error_code',completed_at=(rp->>'completed_at')::timestamptz
    where organisation_id=target_organisation_id and id=(rp->>'id')::uuid and source_id=target_source_id;
  if not found then raise exception 'Ingestion run tenant boundary violation'; end if;
  update public.sources set status=completion_payload->'source'->>'status',actual_sha256=completion_payload->'source'->>'actual_sha256',actual_size_bytes=(completion_payload->'source'->>'actual_size_bytes')::bigint,actual_mime_type=completion_payload->'source'->>'actual_mime_type',completed_at=(completion_payload->'source'->>'completed_at')::timestamptz,updated_at=now()
    where organisation_id=target_organisation_id and id=target_source_id returning * into updated;
  return jsonb_build_object('source',to_jsonb(updated),'replayed',false);
end $$;

create or replace function public.purge_source(target_organisation_id uuid,target_source_id uuid,receipt_id uuid,receipt_created_at timestamptz) returns jsonb
language plpgsql security definer set search_path=public as $$ declare receipt public.execution_receipts%rowtype; evidence_ids uuid[]; draft_ids uuid[]; key text; begin
  if auth.role()<>'service_role' then raise exception 'Trusted service required' using errcode='42501'; end if;
  key:='source-purge:'||target_organisation_id::text||':'||target_source_id::text;
  select * into receipt from public.execution_receipts where organisation_id=target_organisation_id and operation='source.purged' and idempotency_key=key;
  if found then return to_jsonb(receipt); end if;
  if not exists(select 1 from public.sources where organisation_id=target_organisation_id and id=target_source_id) then return null; end if;
  perform set_config('app.source_purge','on',true);
  select coalesce(array_agg(id),'{}') into evidence_ids from public.evidence where organisation_id=target_organisation_id and source_item_id in (select id from public.source_items where organisation_id=target_organisation_id and source_id=target_source_id);
  select coalesce(array_agg(opportunity_draft_id),'{}') into draft_ids from public.opportunity_draft_evidence where organisation_id=target_organisation_id and evidence_id=any(evidence_ids);
  delete from public.opportunity_draft_evidence where organisation_id=target_organisation_id and evidence_id=any(evidence_ids);
  delete from public.opportunity_drafts d where d.organisation_id=target_organisation_id and d.id=any(draft_ids)
    and not exists(select 1 from public.opportunity_draft_evidence de where de.organisation_id=d.organisation_id and de.opportunity_draft_id=d.id);
  delete from public.evidence_links where organisation_id=target_organisation_id and evidence_id=any(evidence_ids);
  delete from public.assumptions where organisation_id=target_organisation_id and evidence_id=any(evidence_ids);
  delete from public.measurements where organisation_id=target_organisation_id and evidence_id=any(evidence_ids);
  delete from public.evidence_reviews where organisation_id=target_organisation_id and candidate_id in (select c.id from public.evidence_candidates c join public.ingestion_runs r on r.organisation_id=c.organisation_id and r.id=c.ingestion_run_id where r.source_id=target_source_id);
  delete from public.evidence_candidates where organisation_id=target_organisation_id and ingestion_run_id in (select id from public.ingestion_runs where organisation_id=target_organisation_id and source_id=target_source_id);
  delete from public.evidence where organisation_id=target_organisation_id and id=any(evidence_ids);
  delete from public.ingestion_runs where organisation_id=target_organisation_id and source_id=target_source_id;
  delete from public.source_items where organisation_id=target_organisation_id and source_id=target_source_id;
  delete from public.sources where organisation_id=target_organisation_id and id=target_source_id;
  insert into public.execution_receipts(id,organisation_id,operation,object_type,object_id,status,idempotency_key,created_at)
  values(receipt_id,target_organisation_id,'source.purged','source',target_source_id,'succeeded',key,receipt_created_at)
  on conflict(organisation_id,operation,idempotency_key) do nothing returning * into receipt;
  if receipt.id is null then select * into receipt from public.execution_receipts where organisation_id=target_organisation_id and operation='source.purged' and idempotency_key=key; end if;
  return to_jsonb(receipt);
end $$;
