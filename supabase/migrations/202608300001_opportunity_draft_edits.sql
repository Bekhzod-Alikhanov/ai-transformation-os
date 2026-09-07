-- Editable drafts remain authoritative, tenant-bound, and fully versioned.

drop policy if exists tenant_write on public.evidence_links;
revoke insert, update, delete on table public.evidence_links from authenticated;

create table if not exists public.opportunity_draft_revisions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  opportunity_draft_id uuid not null,
  version integer not null check (version > 0),
  title text not null,
  problem_statement text not null,
  business_unit text,
  evidence_ids jsonb not null,
  revised_by uuid not null references auth.users(id),
  revised_at timestamptz not null default now(),
  unique (organisation_id, opportunity_draft_id, version),
  foreign key (organisation_id, opportunity_draft_id)
    references public.opportunity_drafts(organisation_id, id) on delete cascade
);
alter table public.opportunity_draft_revisions enable row level security;
create policy opportunity_draft_revisions_read on public.opportunity_draft_revisions
  for select using (public.is_org_member(organisation_id));
create trigger opportunity_draft_revisions_immutable
  before update or delete on public.opportunity_draft_revisions
  for each row execute function public.prevent_immutable_change();
revoke insert, update, delete on table public.opportunity_draft_revisions from authenticated;

create or replace function public.edit_opportunity_draft(
  target_organisation_id uuid,
  actor_user_id uuid,
  target_draft_id uuid,
  expected_version integer,
  draft_payload jsonb
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  draft public.opportunity_drafts%rowtype;
  evidence_ids uuid[] := array(
    select jsonb_array_elements_text(coalesce(draft_payload->'evidence_ids', '[]'::jsonb))::uuid
  );
begin
  perform public.assert_authoritative_actor(target_organisation_id, actor_user_id);
  if target_draft_id is null or expected_version is null
    or coalesce(btrim(draft_payload->>'title'),'') = ''
    or coalesce(btrim(draft_payload->>'problem_statement'),'') = ''
    or coalesce(array_length(evidence_ids, 1), 0) = 0
    or cardinality(evidence_ids) <> cardinality(array(select distinct unnest(evidence_ids))) then
    raise exception 'Invalid opportunity draft edit';
  end if;

  select * into draft from public.opportunity_drafts
    where organisation_id=target_organisation_id and id=target_draft_id for update;
  if not found or draft.status <> 'draft' or draft.version <> expected_version then
    return null;
  end if;
  if (select count(*) from public.evidence evidence join public.evidence_reviews review
    on review.organisation_id=evidence.organisation_id
      and review.resulting_evidence_id=evidence.id
      and review.decision in ('accepted','edited')
    where evidence.organisation_id=target_organisation_id and evidence.id=any(evidence_ids))
    <> cardinality(evidence_ids) then
    raise exception 'Opportunity evidence must be accepted and in this organisation';
  end if;
  if exists (
    select 1 from public.evidence selected
    where selected.organisation_id=target_organisation_id and selected.id=any(evidence_ids)
      and exists (
        select 1 from public.evidence other join public.evidence_reviews other_review
          on other_review.organisation_id=other.organisation_id
            and other_review.resulting_evidence_id=other.id
            and other_review.decision in ('accepted','edited')
        where other.organisation_id=selected.organisation_id
          and other.claim_key=selected.claim_key
          and other.value is distinct from selected.value
      ) and not exists (
        select 1 from public.claim_conflict_resolutions resolution
        where resolution.organisation_id=selected.organisation_id
          and resolution.claim_key=selected.claim_key
          and resolution.selected_evidence_id=selected.id
      )
  ) then
    raise exception 'Unresolved evidence conflict';
  end if;

  insert into public.opportunity_draft_revisions(
    organisation_id, opportunity_draft_id, version, title, problem_statement,
    business_unit, evidence_ids, revised_by
  ) values (
    target_organisation_id, draft.id, draft.version, draft.title,
    draft.problem_statement, draft.business_unit,
    coalesce((select jsonb_agg(evidence_id order by evidence_id)
      from public.opportunity_draft_evidence
      where organisation_id=target_organisation_id and opportunity_draft_id=draft.id), '[]'::jsonb),
    actor_user_id
  );
  delete from public.opportunity_draft_evidence
    where organisation_id=target_organisation_id and opportunity_draft_id=draft.id;
  insert into public.opportunity_draft_evidence(organisation_id, opportunity_draft_id, evidence_id)
    select target_organisation_id, draft.id, unnest(evidence_ids);
  update public.opportunity_drafts set
    title=draft_payload->>'title',
    problem_statement=draft_payload->>'problem_statement',
    business_unit=nullif(draft_payload->>'business_unit',''),
    version=version+1,
    updated_at=now()
    where organisation_id=target_organisation_id and id=draft.id
    returning * into draft;
  return to_jsonb(draft) || jsonb_build_object('evidence_ids', to_jsonb(evidence_ids));
end $$;

revoke all on function public.edit_opportunity_draft(uuid,uuid,uuid,integer,jsonb)
  from public, anon, authenticated;
grant execute on function public.edit_opportunity_draft(uuid,uuid,uuid,integer,jsonb)
  to service_role;
