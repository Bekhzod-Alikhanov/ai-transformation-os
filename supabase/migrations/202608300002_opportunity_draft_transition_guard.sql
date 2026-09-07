-- A rejected draft cannot carry a merge/promote target or create evidence links.

create or replace function public.transition_opportunity_draft(
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
  if next_status not in ('merged','rejected','promoted') then
    raise exception 'Invalid opportunity draft transition';
  end if;
  if next_status='rejected' and target_use_case_id is not null then
    raise exception 'Rejected drafts cannot have a target use case';
  end if;
  select * into draft from public.opportunity_drafts
    where organisation_id=target_organisation_id and id=target_draft_id for update;
  if not found or draft.status<>'draft' or draft.version<>expected_version then return null; end if;
  if not exists(select 1 from public.opportunity_draft_evidence where organisation_id=target_organisation_id and opportunity_draft_id=target_draft_id) then
    raise exception 'Opportunity draft requires evidence';
  end if;
  if next_status='merged' and resolved_use_case_id is null then
    raise exception 'Merge requires a target use case';
  end if;
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
  update public.opportunity_drafts set status=next_status,
    promoted_use_case_id=case when next_status in ('merged','promoted') then resolved_use_case_id else null end,
    version=version+1,updated_at=now()
    where organisation_id=target_organisation_id and id=target_draft_id returning * into draft;
  return to_jsonb(draft) || jsonb_build_object('evidence_ids',coalesce((select jsonb_agg(evidence_id) from public.opportunity_draft_evidence where organisation_id=target_organisation_id and opportunity_draft_id=target_draft_id),'[]'::jsonb));
end $$;

revoke all on function public.transition_opportunity_draft(uuid,uuid,uuid,integer,text,uuid)
  from public, anon, authenticated;
grant execute on function public.transition_opportunity_draft(uuid,uuid,uuid,integer,text,uuid)
  to service_role;
