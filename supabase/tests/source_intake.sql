begin;
select plan(44);

select has_table('public', 'provider_credentials', 'provider credentials are persisted');
select has_table('public', 'evidence_candidates', 'evidence candidates are persisted');
select has_table('public', 'evidence_reviews', 'evidence reviews are persisted');
select has_table('public', 'opportunity_drafts', 'opportunity drafts are persisted');
select has_table('public', 'ingestion_runs', 'ingestion runs are persisted');
select has_table('public', 'execution_receipts', 'execution receipts are persisted');

select row_security_active('public', 'provider_credentials', 'credential RLS is active');
select row_security_active('public', 'evidence_candidates', 'candidate RLS is active');
select row_security_active('public', 'evidence_reviews', 'review RLS is active');
select row_security_active('public', 'opportunity_drafts', 'draft RLS is active');
select row_security_active('public', 'ingestion_runs', 'ingestion run RLS is active');
select row_security_active('public', 'execution_receipts', 'receipt RLS is active');

select has_function(
  'public',
  'complete_source_upload',
  array['uuid', 'uuid', 'jsonb'],
  'completion uses an atomic database operation'
);
select has_function(
  'public',
  'purge_source',
  array['uuid', 'uuid', 'uuid', 'timestamptz'],
  'purge uses an atomic database operation'
);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'source-one@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'source-two@example.test', '', now(), now(), now());
insert into public.organisations (id, name, slug) values
  ('10000000-0000-0000-0000-000000000011', 'Source Organisation One', 'source-organisation-one'),
  ('10000000-0000-0000-0000-000000000012', 'Source Organisation Two', 'source-organisation-two');
insert into public.organisation_memberships (organisation_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011', 'owner'),
  ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000012', 'owner');
insert into public.sources (
  id, organisation_id, kind, name, storage_path, status,
  expected_sha256, expected_size_bytes, expected_mime_type,
  acknowledged_internal_non_regulated, ai_processing_consent,
  consented_at, created_by
) values
  (
    '20000000-0000-0000-0000-000000000011',
    '10000000-0000-0000-0000-000000000011',
    'text', 'one.txt',
    '10000000-0000-0000-0000-000000000011/20000000-0000-0000-0000-000000000011.txt',
    'awaiting_upload', repeat('a', 64), 12, 'text/plain', true, true, now(),
    '00000000-0000-0000-0000-000000000011'
  ),
  (
    '20000000-0000-0000-0000-000000000012',
    '10000000-0000-0000-0000-000000000012',
    'text', 'two.txt',
    '10000000-0000-0000-0000-000000000012/20000000-0000-0000-0000-000000000012.txt',
    'awaiting_upload', repeat('b', 64), 12, 'text/plain', true, true, now(),
    '00000000-0000-0000-0000-000000000012'
  );

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000011","role":"authenticated"}', true);

select results_eq(
  $$ select name from public.sources order by name $$,
  $$ values ('one.txt'::text) $$,
  'source reads remain tenant isolated'
);
select throws_ok(
  $$ insert into public.sources (organisation_id, kind, name, status) values ('10000000-0000-0000-0000-000000000012', 'text', 'cross-tenant.txt', 'failed') $$,
  '42501', null,
  'source lifecycle writes cannot cross tenants'
);
select lives_ok(
  $$ update public.sources set status='queued' where id='20000000-0000-0000-0000-000000000011' $$,
  'authenticated lifecycle update is filtered by RLS'
);
select results_eq(
  $$ select status from public.sources where id='20000000-0000-0000-0000-000000000011' $$,
  $$ values ('awaiting_upload'::text) $$,
  'authenticated clients cannot mutate source lifecycle'
);
select throws_ok(
  $$ select public.complete_source_upload('10000000-0000-0000-0000-000000000011','20000000-0000-0000-0000-000000000011','{"version":1}'::jsonb) $$,
  '42501', null, 'authenticated clients cannot invoke trusted completion'
);
select is_empty(
  $$ select * from public.provider_credentials $$,
  'encrypted provider credentials are never client-readable'
);
select throws_ok(
  $$ insert into storage.objects (id, bucket_id, name, owner) values ('30000000-0000-0000-0000-000000000011', 'enterprise-sources', 'not-a-uuid/file.txt', '00000000-0000-0000-0000-000000000011') $$,
  '42501', null,
  'malformed storage paths are denied without a cast error'
);
select throws_ok(
  $$ insert into storage.objects (id, bucket_id, name, owner) values ('30000000-0000-0000-0000-000000000012', 'enterprise-sources', '10000000-0000-0000-0000-000000000012/file.txt', '00000000-0000-0000-0000-000000000011') $$,
  '42501', null,
  'storage writes cannot cross tenants'
);

reset role;
select throws_ok(
  $$ insert into public.source_items(id,organisation_id,source_id,content,content_hash,source_locator) values('35000000-0000-0000-0000-000000000012','10000000-0000-0000-0000-000000000012','20000000-0000-0000-0000-000000000011','cross org',repeat('d',64),'{"type":"text_line","startLine":1,"endLine":1}') $$,
  '23503', null, 'composite foreign keys deny cross-organisation source references'
);
insert into public.source_items (
  id, organisation_id, source_id, content, content_hash, source_locator
) values (
  '35000000-0000-0000-0000-000000000011',
  '10000000-0000-0000-0000-000000000011',
  '20000000-0000-0000-0000-000000000011',
  'immutable source content', repeat('c', 64),
  '{"type":"text_line","startLine":1,"endLine":1}'
);
select throws_ok(
  $$ update public.source_items set content = 'changed' where id = '35000000-0000-0000-0000-000000000011' $$,
  'P0001', 'Immutable source items cannot be updated or deleted',
  'source items are immutable outside controlled purge'
);

insert into public.execution_receipts (
  id, organisation_id, operation, object_type, object_id, status, idempotency_key
) values (
  '40000000-0000-0000-0000-000000000011',
  '10000000-0000-0000-0000-000000000011',
  'test.operation', 'source',
  '20000000-0000-0000-0000-000000000011', 'succeeded', 'test-operation-11'
);
select throws_ok(
  $$ update public.execution_receipts set status = 'failed' where id = '40000000-0000-0000-0000-000000000011' $$,
  'P0001', 'Immutable records cannot be updated or deleted',
  'execution receipts are immutable'
);

update public.sources set status='parsing' where id='20000000-0000-0000-0000-000000000011';
insert into public.ingestion_runs(id,organisation_id,source_id,status,parser_version,started_at)
values('36000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000011','20000000-0000-0000-0000-000000000011','running','test',now());
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
select is(
  (public.complete_source_upload('10000000-0000-0000-0000-000000000011','20000000-0000-0000-0000-000000000011',jsonb_build_object(
    'version',1,'source',jsonb_build_object('status','queued','actual_sha256',repeat('a',64),'actual_size_bytes',12,'actual_mime_type','text/plain','completed_at',now()),
    'items','[]'::jsonb,'run',jsonb_build_object('id','36000000-0000-0000-0000-000000000011','organisation_id','10000000-0000-0000-0000-000000000011','source_id','20000000-0000-0000-0000-000000000011','status','queued','item_count',0,'completed_at',now())
  ))->>'replayed')::boolean, false, 'atomic completion applies once'
);
select is(
  (public.complete_source_upload('10000000-0000-0000-0000-000000000011','20000000-0000-0000-0000-000000000011','{"version":1}'::jsonb)->>'replayed')::boolean,
  true, 'duplicate atomic completion is a replay'
);
reset role;
insert into public.evidence_candidates(id,organisation_id,ingestion_run_id,source_item_id,claim_key,claim,confidence,source_locator,status)
values('37000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000011','36000000-0000-0000-0000-000000000011','35000000-0000-0000-0000-000000000011','cycle','Cycle time',0.9,'{"type":"text_line","startLine":1,"endLine":1}','accepted');
insert into public.evidence(id,organisation_id,source_item_id,claim_key,claim,value,unit,provenance,confidence,source_locator,extraction_method)
values('38000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000011','35000000-0000-0000-0000-000000000011','cycle','Cycle time','8'::jsonb,'hours','observed',0.9,'{"type":"text_line","startLine":1,"endLine":1}','parser');
insert into public.evidence_reviews(id,organisation_id,candidate_id,decision,rationale,resulting_evidence_id,reviewed_by)
values('39000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000011','37000000-0000-0000-0000-000000000011','accepted','Verified against source','38000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000011');
insert into public.use_cases(id,organisation_id,slug,title,business_unit,problem_statement,status,classification)
values('42000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000011','purge-lineage','Purge lineage','Operations','Validate source purge','draft','internal');
insert into public.evidence_links(id,organisation_id,evidence_id,use_case_id,relationship)
values('43000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000011','38000000-0000-0000-0000-000000000011','42000000-0000-0000-0000-000000000011','supports');
insert into public.assumptions(id,organisation_id,use_case_id,key,label,value,unit,provenance,confidence,evidence_id)
values('44000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000011','42000000-0000-0000-0000-000000000011','cycle-hours','Cycle hours','8'::jsonb,'hours','observed',0.9,'38000000-0000-0000-0000-000000000011');
insert into public.pilots(id,organisation_id,use_case_id,phase,status,plan)
values('45000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000011','42000000-0000-0000-0000-000000000011','0-30','planned','{}'::jsonb);
insert into public.kpis(id,organisation_id,pilot_id,key,label,unit,target,direction)
values('46000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000011','45000000-0000-0000-0000-000000000011','cycle-hours','Cycle hours','hours',6,'decrease');
insert into public.measurements(id,organisation_id,kpi_id,value,measured_at,evidence_id)
values('47000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000011','46000000-0000-0000-0000-000000000011',8,now(),'38000000-0000-0000-0000-000000000011');
insert into public.opportunity_drafts(id,organisation_id,title,problem_statement,status,created_by)
values('48000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000011','Cycle-time opportunity','Cycle time is eight hours','draft','00000000-0000-0000-0000-000000000011');
insert into public.opportunity_draft_evidence(organisation_id,opportunity_draft_id,evidence_id)
values('10000000-0000-0000-0000-000000000011','48000000-0000-0000-0000-000000000011','38000000-0000-0000-0000-000000000011');
select throws_ok(
  $$ update public.evidence_candidates set claim='changed' where id='37000000-0000-0000-0000-000000000011' $$,
  'P0001','Terminal evidence candidates are immutable','terminal candidate updates are denied'
);
select throws_ok(
  $$ delete from public.evidence_candidates where id='37000000-0000-0000-0000-000000000011' $$,
  'P0001','Terminal evidence candidates are immutable','terminal candidate deletes are denied'
);
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
select is(
  (public.purge_source('10000000-0000-0000-0000-000000000011','20000000-0000-0000-0000-000000000011','41000000-0000-0000-0000-000000000011',now())->>'id')::uuid,
  '41000000-0000-0000-0000-000000000011'::uuid,'purge creates a content-free receipt'
);
select is(
  (public.purge_source('10000000-0000-0000-0000-000000000011','20000000-0000-0000-0000-000000000011','41000000-0000-0000-0000-000000000012',now())->>'id')::uuid,
  '41000000-0000-0000-0000-000000000011'::uuid,'duplicate purge reuses the same receipt'
);
select is((select count(*) from public.sources where id='20000000-0000-0000-0000-000000000011'),0::bigint,'purge removes the source');
select is((select count(*) from public.source_items where id='35000000-0000-0000-0000-000000000011'),0::bigint,'purge removes source items');
select is((select count(*) from public.ingestion_runs where id='36000000-0000-0000-0000-000000000011'),0::bigint,'purge removes ingestion runs');
select is((select count(*) from public.evidence_candidates where id='37000000-0000-0000-0000-000000000011'),0::bigint,'purge removes evidence candidates');
select is((select count(*) from public.evidence_reviews where id='39000000-0000-0000-0000-000000000011'),0::bigint,'purge removes evidence reviews');
select is((select count(*) from public.evidence where id='38000000-0000-0000-0000-000000000011'),0::bigint,'purge removes accepted evidence');
select is((select count(*) from public.evidence_links where id='43000000-0000-0000-0000-000000000011'),0::bigint,'purge removes evidence links');
select is((select count(*) from public.assumptions where id='44000000-0000-0000-0000-000000000011'),0::bigint,'purge removes evidence-backed assumptions');
select is((select count(*) from public.measurements where id='47000000-0000-0000-0000-000000000011'),0::bigint,'purge removes evidence-backed measurements');
select is((select count(*) from public.opportunity_draft_evidence where opportunity_draft_id='48000000-0000-0000-0000-000000000011'),0::bigint,'purge removes opportunity evidence junctions');
select is((select count(*) from public.opportunity_drafts where id='48000000-0000-0000-0000-000000000011'),0::bigint,'purge removes source-derived opportunity drafts');
select results_eq(
  $$ select operation,object_type,object_id,status,idempotency_key from public.execution_receipts where operation='source.purged' and object_id='20000000-0000-0000-0000-000000000011' $$,
  $$ values ('source.purged'::text,'source'::text,'20000000-0000-0000-0000-000000000011'::uuid,'succeeded'::text,'source-purge:10000000-0000-0000-0000-000000000011:20000000-0000-0000-0000-000000000011'::text) $$,
  'purge retains exactly one deterministic content-free receipt'
);
select is(
  (select count(*) from public.sources where id='20000000-0000-0000-0000-000000000011')
  +(select count(*) from public.source_items where source_id='20000000-0000-0000-0000-000000000011')
  +(select count(*) from public.ingestion_runs where source_id='20000000-0000-0000-0000-000000000011')
  +(select count(*) from public.evidence where id='38000000-0000-0000-0000-000000000011')
  +(select count(*) from public.opportunity_drafts where id='48000000-0000-0000-0000-000000000011'),
  0::bigint,'purge replay does not recreate source-derived rows'
);
select * from finish();
rollback;
