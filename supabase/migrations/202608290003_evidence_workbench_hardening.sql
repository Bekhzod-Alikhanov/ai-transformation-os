-- Task 3 authoritative evidence facts may be written only by trusted server RPCs.
-- Every RPC independently binds the supplied actor to an in-organisation privileged role.

drop policy if exists evidence_candidates_insert on public.evidence_candidates;
drop policy if exists evidence_reviews_insert on public.evidence_reviews;
drop policy if exists opportunity_drafts_write on public.opportunity_drafts;
drop policy if exists opportunity_draft_evidence_write on public.opportunity_draft_evidence;
drop policy if exists ingestion_runs_write on public.ingestion_runs;

revoke insert, update, delete on table public.evidence from authenticated;
revoke insert, update, delete on table public.evidence_candidates from authenticated;
revoke insert, update, delete on table public.evidence_reviews from authenticated;
revoke insert, update, delete on table public.agent_events from authenticated;
revoke insert, update, delete on table public.opportunity_drafts from authenticated;
revoke insert, update, delete on table public.opportunity_draft_evidence from authenticated;
revoke insert, update, delete on table public.claim_conflict_resolutions from authenticated;

create or replace function public.assert_authoritative_actor(
  target_organisation_id uuid,
  actor_user_id uuid
) returns void
language plpgsql security definer set search_path=public as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Trusted service required' using errcode='42501';
  end if;
  if actor_user_id is null or not exists (
    select 1 from public.organisation_memberships membership
    where membership.organisation_id=target_organisation_id
      and membership.user_id=actor_user_id
      and membership.role in ('owner','admin','transformation_lead','analyst')
  ) then
    raise exception 'Actor is not authorised for evidence operations' using errcode='42501';
  end if;
end $$;

drop function if exists public.review_evidence_candidate(uuid,jsonb);
create function public.review_evidence_candidate(
  target_organisation_id uuid,
  actor_user_id uuid,
  candidate_review jsonb
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  candidate public.evidence_candidates%rowtype;
  inferred public.evidence%rowtype;
  result_evidence public.evidence%rowtype;
  decision text := candidate_review->>'decision';
  candidate_id uuid := (candidate_review->>'candidate_id')::uuid;
  reviewed_at timestamptz := (candidate_review->>'reviewed_at')::timestamptz;
begin
  perform public.assert_authoritative_actor(target_organisation_id, actor_user_id);
  if decision not in ('accepted','edited','rejected')
    or coalesce(btrim(candidate_review->>'rationale'),'') = ''
    or candidate_id is null or reviewed_at is null then
    raise exception 'Invalid candidate review';
  end if;
  if decision='edited' and not (candidate_review ? 'edited_value') then
    raise exception 'Edited review requires a value';
  end if;
  select * into candidate from public.evidence_candidates
    where organisation_id=target_organisation_id and id=candidate_id for update;
  if not found then return null; end if;
  if candidate.status <> 'pending' then
    raise exception 'stale evidence candidate' using errcode='40001';
  end if;
  if decision <> 'rejected' then
    insert into public.evidence(
      id,organisation_id,source_item_id,claim_key,claim,value,unit,provenance,
      confidence,source_locator,extraction_method,created_by,created_at
    ) values (
      (candidate_review->>'evidence_id')::uuid,target_organisation_id,candidate.source_item_id,
      candidate.claim_key,candidate.claim,candidate.value,candidate.unit,'ai_inferred',
      candidate.confidence,candidate.source_locator,'candidate_review',actor_user_id,reviewed_at
    ) returning * into inferred;
    result_evidence:=inferred;
    if decision='edited' then
      insert into public.evidence(
        id,organisation_id,source_item_id,claim_key,claim,value,unit,provenance,
        confidence,source_locator,extraction_method,parent_evidence_id,created_by,created_at
      ) values (
        (candidate_review->>'edited_evidence_id')::uuid,target_organisation_id,candidate.source_item_id,
        candidate.claim_key,candidate.claim,candidate_review->'edited_value',candidate.unit,'user_provided',
        candidate.confidence,candidate.source_locator,'human_correction',inferred.id,actor_user_id,reviewed_at
      ) returning * into result_evidence;
    end if;
  end if;
  update public.evidence_candidates set status=decision
    where organisation_id=target_organisation_id and id=candidate.id;
  insert into public.evidence_reviews(
    organisation_id,candidate_id,decision,rationale,edited_value,resulting_evidence_id,reviewed_by,reviewed_at
  ) values (
    target_organisation_id,candidate.id,decision,candidate_review->>'rationale',
    case when decision='edited' then candidate_review->'edited_value' else null end,
    case when decision='rejected' then null else result_evidence.id end,actor_user_id,reviewed_at
  );
  select * into candidate from public.evidence_candidates
    where organisation_id=target_organisation_id and id=candidate.id;
  return jsonb_build_object('candidate',to_jsonb(candidate),'evidence',case when decision='rejected' then null else to_jsonb(result_evidence) end);
end $$;

create or replace function public.resolve_claim_conflict(
  target_organisation_id uuid,
  actor_user_id uuid,
  target_claim_key text,
  selected_evidence_id uuid,
  resolution_rationale text
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare resolution public.claim_conflict_resolutions%rowtype;
begin
  perform public.assert_authoritative_actor(target_organisation_id, actor_user_id);
  if coalesce(btrim(target_claim_key),'')='' or coalesce(btrim(resolution_rationale),'')='' then
    raise exception 'Conflict resolution requires claim key and rationale';
  end if;
  if not exists (
    select 1 from public.evidence evidence join public.evidence_reviews review
      on review.organisation_id=evidence.organisation_id
        and review.resulting_evidence_id=evidence.id
        and review.decision in ('accepted','edited')
    where evidence.organisation_id=target_organisation_id
      and evidence.id=selected_evidence_id and evidence.claim_key=target_claim_key
  ) then
    raise exception 'Resolution must select accepted evidence in this organisation';
  end if;
  if not exists (
    select 1 from public.evidence left_evidence join public.evidence right_evidence
      on right_evidence.organisation_id=left_evidence.organisation_id
        and right_evidence.claim_key=left_evidence.claim_key and right_evidence.id<>left_evidence.id
      join public.evidence_reviews left_review on left_review.resulting_evidence_id=left_evidence.id
        and left_review.organisation_id=left_evidence.organisation_id and left_review.decision in ('accepted','edited')
      join public.evidence_reviews right_review on right_review.resulting_evidence_id=right_evidence.id
        and right_review.organisation_id=right_evidence.organisation_id and right_review.decision in ('accepted','edited')
    where left_evidence.organisation_id=target_organisation_id and left_evidence.claim_key=target_claim_key
      and left_evidence.value is distinct from right_evidence.value
  ) then
    raise exception 'No accepted contradiction exists for this claim';
  end if;
  insert into public.claim_conflict_resolutions(
    organisation_id,claim_key,selected_evidence_id,rationale,resolved_by
  ) values (
    target_organisation_id,target_claim_key,selected_evidence_id,resolution_rationale,actor_user_id
  ) returning * into resolution;
  return to_jsonb(resolution);
end $$;

create or replace function public.eligible_opportunity_evidence(
  target_organisation_id uuid,
  actor_user_id uuid
) returns table(
  id uuid, organisation_id uuid, claim_key text, claim text, value jsonb, source_name text
)
language plpgsql security definer set search_path=public as $$
begin
  perform public.assert_authoritative_actor(target_organisation_id, actor_user_id);
  return query
  select evidence.id,evidence.organisation_id,evidence.claim_key,evidence.claim,evidence.value,
    coalesce(source.name,'Evidence source')
  from public.evidence evidence
  join public.evidence_reviews review on review.organisation_id=evidence.organisation_id
    and review.resulting_evidence_id=evidence.id and review.decision in ('accepted','edited')
  left join public.source_items item on item.organisation_id=evidence.organisation_id and item.id=evidence.source_item_id
  left join public.sources source on source.organisation_id=item.organisation_id and source.id=item.source_id
  where evidence.organisation_id=target_organisation_id
    and (
      not exists (
        select 1 from public.evidence other join public.evidence_reviews other_review
          on other_review.organisation_id=other.organisation_id and other_review.resulting_evidence_id=other.id
            and other_review.decision in ('accepted','edited')
        where other.organisation_id=evidence.organisation_id and other.claim_key=evidence.claim_key
          and other.value is distinct from evidence.value
      )
      or exists (
        select 1 from public.claim_conflict_resolutions resolution
        where resolution.organisation_id=evidence.organisation_id and resolution.claim_key=evidence.claim_key
          and resolution.selected_evidence_id=evidence.id
      )
    );
end $$;

drop function if exists public.create_opportunity_draft(uuid,jsonb);
create function public.create_opportunity_draft(
  target_organisation_id uuid,
  actor_user_id uuid,
  draft_payload jsonb
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare created public.opportunity_drafts%rowtype;
declare draft_id uuid := (draft_payload->>'id')::uuid;
declare evidence_ids uuid[] := array(select jsonb_array_elements_text(draft_payload->'evidence_ids')::uuid);
begin
  perform public.assert_authoritative_actor(target_organisation_id, actor_user_id);
  if draft_id is null or coalesce(btrim(draft_payload->>'title'),'')='' or coalesce(btrim(draft_payload->>'problem_statement'),'')=''
    or coalesce(array_length(evidence_ids,1),0)=0 then raise exception 'Invalid opportunity draft'; end if;
  if (select count(*) from public.evidence evidence join public.evidence_reviews review
    on review.organisation_id=evidence.organisation_id and review.resulting_evidence_id=evidence.id and review.decision in ('accepted','edited')
    where evidence.organisation_id=target_organisation_id and evidence.id=any(evidence_ids)) <> array_length(evidence_ids,1) then
    raise exception 'Opportunity evidence must be accepted and in this organisation';
  end if;
  if exists (
    select 1 from public.evidence selected
    where selected.organisation_id=target_organisation_id and selected.id=any(evidence_ids)
      and exists (
        select 1 from public.evidence other join public.evidence_reviews other_review
          on other_review.organisation_id=other.organisation_id and other_review.resulting_evidence_id=other.id and other_review.decision in ('accepted','edited')
        where other.organisation_id=selected.organisation_id and other.claim_key=selected.claim_key and other.value is distinct from selected.value
      )
      and not exists (
        select 1 from public.claim_conflict_resolutions resolution
        where resolution.organisation_id=selected.organisation_id and resolution.claim_key=selected.claim_key
          and resolution.selected_evidence_id=selected.id
      )
  ) then raise exception 'Unresolved evidence conflict'; end if;
  insert into public.opportunity_drafts(id,organisation_id,title,problem_statement,business_unit,status,version,created_by)
  values(draft_id,target_organisation_id,draft_payload->>'title',draft_payload->>'problem_statement',nullif(draft_payload->>'business_unit',''),'draft',1,actor_user_id)
  returning * into created;
  insert into public.opportunity_draft_evidence(organisation_id,opportunity_draft_id,evidence_id)
    select target_organisation_id,created.id,unnest(evidence_ids);
  return to_jsonb(created) || jsonb_build_object('evidence_ids',to_jsonb(evidence_ids));
end $$;

drop function if exists public.transition_opportunity_draft(uuid,uuid,integer,text,uuid);
create function public.transition_opportunity_draft(
  target_organisation_id uuid,
  actor_user_id uuid,
  target_draft_id uuid,
  expected_version integer,
  next_status text,
  target_use_case_id uuid default null
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare draft public.opportunity_drafts%rowtype;
declare resolved_use_case_id uuid := target_use_case_id;
begin
  perform public.assert_authoritative_actor(target_organisation_id, actor_user_id);
  if next_status not in ('merged','rejected','promoted') then raise exception 'Invalid opportunity draft transition'; end if;
  select * into draft from public.opportunity_drafts where organisation_id=target_organisation_id and id=target_draft_id for update;
  if not found or draft.status<>'draft' or draft.version<>expected_version then return null; end if;
  if not exists(select 1 from public.opportunity_draft_evidence where organisation_id=target_organisation_id and opportunity_draft_id=target_draft_id) then
    raise exception 'Opportunity draft requires evidence';
  end if;
  if next_status='merged' and resolved_use_case_id is null then raise exception 'Merge requires a target use case'; end if;
  if resolved_use_case_id is null and next_status='promoted' then
    insert into public.use_cases(organisation_id,slug,title,business_unit,problem_statement,status,classification,owner_id)
    values(target_organisation_id,'draft-' || replace(target_draft_id::text,'-',''),draft.title,coalesce(draft.business_unit,'Operations'),draft.problem_statement,'draft','internal',actor_user_id)
    returning id into resolved_use_case_id;
  end if;
  if resolved_use_case_id is not null and not exists(select 1 from public.use_cases where organisation_id=target_organisation_id and id=resolved_use_case_id) then
    raise exception 'Draft target must belong to this organisation';
  end if;
  if resolved_use_case_id is not null then
    insert into public.evidence_links(organisation_id,evidence_id,use_case_id,relationship)
    select target_organisation_id,evidence_id,resolved_use_case_id,'supports'
    from public.opportunity_draft_evidence where organisation_id=target_organisation_id and opportunity_draft_id=target_draft_id
    on conflict (evidence_id,use_case_id,relationship) do nothing;
  end if;
  update public.opportunity_drafts set status=next_status, promoted_use_case_id=case when next_status in ('merged','promoted') then resolved_use_case_id else null end,
    version=version+1,updated_at=now() where organisation_id=target_organisation_id and id=target_draft_id returning * into draft;
  return to_jsonb(draft) || jsonb_build_object('evidence_ids',coalesce((select jsonb_agg(evidence_id) from public.opportunity_draft_evidence where organisation_id=target_organisation_id and opportunity_draft_id=target_draft_id),'[]'::jsonb));
end $$;

revoke all on function public.review_evidence_candidate(uuid,uuid,jsonb) from public, anon, authenticated;
revoke all on function public.resolve_claim_conflict(uuid,uuid,text,uuid,text) from public, anon, authenticated;
revoke all on function public.eligible_opportunity_evidence(uuid,uuid) from public, anon, authenticated;
revoke all on function public.create_opportunity_draft(uuid,uuid,jsonb) from public, anon, authenticated;
revoke all on function public.transition_opportunity_draft(uuid,uuid,uuid,integer,text,uuid) from public, anon, authenticated;
grant execute on function public.review_evidence_candidate(uuid,uuid,jsonb) to service_role;
grant execute on function public.resolve_claim_conflict(uuid,uuid,text,uuid,text) to service_role;
grant execute on function public.eligible_opportunity_evidence(uuid,uuid) to service_role;
grant execute on function public.create_opportunity_draft(uuid,uuid,jsonb) to service_role;
grant execute on function public.transition_opportunity_draft(uuid,uuid,uuid,integer,text,uuid) to service_role;
