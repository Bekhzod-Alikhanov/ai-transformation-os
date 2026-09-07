-- Evidence review is intentionally committed as a trusted, tenant-bound transaction.
-- Direct review/evidence updates remain blocked by the existing immutable triggers.

alter table public.evidence add column parent_evidence_id uuid;
alter table public.evidence add constraint evidence_org_parent_fkey
  foreign key (organisation_id, parent_evidence_id)
  references public.evidence (organisation_id, id) on delete cascade;

create index evidence_org_claim_created_idx
  on public.evidence (organisation_id, claim_key, created_at desc);
create index agent_events_org_run_sequence_idx
  on public.agent_events (organisation_id, run_id, sequence);

alter table public.approvals add column assigned_to uuid references auth.users(id);
create index approvals_org_assigned_status_idx
  on public.approvals (organisation_id, assigned_to, status, expires_at);

create table public.claim_conflict_resolutions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  claim_key text not null,
  selected_evidence_id uuid not null,
  rationale text not null,
  resolved_by uuid not null references auth.users(id),
  resolved_at timestamptz not null default now(),
  unique (organisation_id, claim_key),
  foreign key (organisation_id, selected_evidence_id)
    references public.evidence (organisation_id, id) on delete cascade
);
alter table public.claim_conflict_resolutions enable row level security;
create policy claim_conflict_resolutions_read on public.claim_conflict_resolutions
  for select using (public.is_org_member(organisation_id));
create trigger claim_conflict_resolutions_immutable before update or delete
  on public.claim_conflict_resolutions for each row
  execute function public.prevent_purgeable_immutable_change();

create or replace function public.review_evidence_candidate(
  target_organisation_id uuid,
  candidate_review jsonb
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  candidate public.evidence_candidates%rowtype;
  inferred public.evidence%rowtype;
  result_evidence public.evidence%rowtype;
  decision text := candidate_review->>'decision';
  candidate_id uuid := (candidate_review->>'candidate_id')::uuid;
  reviewed_by uuid := (candidate_review->>'reviewed_by')::uuid;
  reviewed_at timestamptz := (candidate_review->>'reviewed_at')::timestamptz;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Trusted service required' using errcode='42501';
  end if;
  if decision not in ('accepted','edited','rejected')
    or coalesce(btrim(candidate_review->>'rationale'),'') = ''
    or reviewed_by is null or reviewed_at is null then
    raise exception 'Invalid candidate review';
  end if;
  if decision = 'edited' and not (candidate_review ? 'edited_value') then
    raise exception 'Edited review requires a value';
  end if;

  select * into candidate from public.evidence_candidates
    where organisation_id=target_organisation_id and id=candidate_id
    for update;
  if not found then return null; end if;
  if candidate.status <> 'pending' then
    raise exception 'stale evidence candidate' using errcode='40001';
  end if;

  if decision <> 'rejected' then
    insert into public.evidence(
      id, organisation_id, source_item_id, claim_key, claim, value, unit,
      provenance, confidence, source_locator, extraction_method, created_by, created_at
    ) values (
      (candidate_review->>'evidence_id')::uuid, target_organisation_id,
      candidate.source_item_id, candidate.claim_key, candidate.claim,
      candidate.value, candidate.unit, 'ai_inferred', candidate.confidence,
      candidate.source_locator, 'candidate_review', reviewed_by, reviewed_at
    ) returning * into inferred;
    result_evidence := inferred;

    if decision = 'edited' then
      insert into public.evidence(
        id, organisation_id, source_item_id, claim_key, claim, value, unit,
        provenance, confidence, source_locator, extraction_method, parent_evidence_id,
        created_by, created_at
      ) values (
        (candidate_review->>'edited_evidence_id')::uuid, target_organisation_id,
        candidate.source_item_id, candidate.claim_key, candidate.claim,
        candidate_review->'edited_value', candidate.unit, 'user_provided',
        candidate.confidence, candidate.source_locator, 'human_correction', inferred.id,
        reviewed_by, reviewed_at
      ) returning * into result_evidence;
    end if;
  end if;

  update public.evidence_candidates set status=decision
    where organisation_id=target_organisation_id and id=candidate.id;
  insert into public.evidence_reviews(
    organisation_id,candidate_id,decision,rationale,edited_value,resulting_evidence_id,
    reviewed_by,reviewed_at
  ) values (
    target_organisation_id,candidate.id,decision,candidate_review->>'rationale',
    case when decision='edited' then candidate_review->'edited_value' else null end,
    case when decision='rejected' then null else result_evidence.id end,
    reviewed_by,reviewed_at
  );

  select * into candidate from public.evidence_candidates
    where organisation_id=target_organisation_id and id=candidate.id;
  return jsonb_build_object(
    'candidate', to_jsonb(candidate),
    'evidence', case when decision='rejected' then null else to_jsonb(result_evidence) end
  );
end $$;

create or replace function public.create_opportunity_draft(
  target_organisation_id uuid,
  draft_payload jsonb
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  created public.opportunity_drafts%rowtype;
  draft_id uuid := (draft_payload->>'id')::uuid;
  creator_id uuid := (draft_payload->>'created_by')::uuid;
  evidence_ids uuid[] := array(select jsonb_array_elements_text(draft_payload->'evidence_ids')::uuid);
begin
  if auth.role() <> 'service_role' then
    raise exception 'Trusted service required' using errcode='42501';
  end if;
  if draft_id is null or creator_id is null
    or coalesce(btrim(draft_payload->>'title'),'') = ''
    or coalesce(btrim(draft_payload->>'problem_statement'),'') = ''
    or coalesce(array_length(evidence_ids,1),0) = 0 then
    raise exception 'Invalid opportunity draft';
  end if;
  if (select count(*) from public.evidence where organisation_id=target_organisation_id and id=any(evidence_ids)) <> array_length(evidence_ids,1) then
    raise exception 'Opportunity evidence tenant boundary violation';
  end if;
  if exists (
    select 1 from public.evidence a join public.evidence b
      on a.organisation_id=b.organisation_id and a.claim_key=b.claim_key and a.id<b.id
    where a.organisation_id=target_organisation_id
      and a.id=any(evidence_ids) and b.id=any(evidence_ids)
      and a.value is distinct from b.value
      and not exists(
        select 1 from public.claim_conflict_resolutions r
          where r.organisation_id=target_organisation_id and r.claim_key=a.claim_key
            and r.selected_evidence_id=any(array[a.id,b.id])
      )
  ) then
    raise exception 'Unresolved evidence conflict';
  end if;
  insert into public.opportunity_drafts(
    id,organisation_id,title,problem_statement,business_unit,status,version,created_by
  ) values (
    draft_id,target_organisation_id,draft_payload->>'title',draft_payload->>'problem_statement',
    nullif(draft_payload->>'business_unit',''),'draft',1,creator_id
  ) returning * into created;
  insert into public.opportunity_draft_evidence(organisation_id,opportunity_draft_id,evidence_id)
    select target_organisation_id,created.id,unnest(evidence_ids);
  return to_jsonb(created);
end $$;

create or replace function public.transition_opportunity_draft(
  target_organisation_id uuid,
  target_draft_id uuid,
  expected_version integer,
  next_status text,
  target_use_case_id uuid default null
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare draft public.opportunity_drafts%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Trusted service required' using errcode='42501';
  end if;
  if next_status not in ('merged','rejected','promoted') then
    raise exception 'Invalid opportunity draft transition';
  end if;
  select * into draft from public.opportunity_drafts
    where organisation_id=target_organisation_id and id=target_draft_id
    for update;
  if not found or draft.version <> expected_version or draft.status <> 'draft' then
    return null;
  end if;
  if next_status='promoted' and (
    target_use_case_id is null or not exists(
      select 1 from public.use_cases
        where organisation_id=target_organisation_id and id=target_use_case_id
    )
  ) then
    raise exception 'Promoted draft requires an organisation use case';
  end if;
  if not exists(
    select 1 from public.opportunity_draft_evidence
      where organisation_id=target_organisation_id and opportunity_draft_id=target_draft_id
  ) then
    raise exception 'Opportunity draft requires evidence';
  end if;
  update public.opportunity_drafts set
    status=next_status,
    promoted_use_case_id=case when next_status='promoted' then target_use_case_id else null end,
    version=version+1,
    updated_at=now()
    where organisation_id=target_organisation_id and id=target_draft_id
    returning * into draft;
  return to_jsonb(draft);
end $$;

create or replace function public.record_agent_run_event(
  target_organisation_id uuid,
  target_run_id uuid,
  event_sequence integer,
  event_type_input text,
  event_summary text,
  event_payload jsonb default '{}'::jsonb,
  event_occurred_at timestamptz default now()
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare created public.agent_events%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Trusted service required' using errcode='42501';
  end if;
  if not exists(select 1 from public.agent_runs where organisation_id=target_organisation_id and id=target_run_id) then
    return null;
  end if;
  insert into public.agent_events(
    organisation_id,run_id,sequence,event_type,summary,payload,occurred_at
  ) values (
    target_organisation_id,target_run_id,event_sequence,event_type_input,event_summary,
    coalesce(event_payload,'{}'::jsonb),event_occurred_at
  ) on conflict (run_id,sequence) do nothing returning * into created;
  if created.id is null then
    select * into created from public.agent_events
      where organisation_id=target_organisation_id and run_id=target_run_id
        and sequence=event_sequence;
  end if;
  return to_jsonb(created);
end $$;

drop trigger if exists agent_events_immutable on public.agent_events;
create trigger agent_events_immutable before update or delete on public.agent_events
  for each row execute function public.prevent_purgeable_immutable_change();

alter publication supabase_realtime add table public.agent_events;
