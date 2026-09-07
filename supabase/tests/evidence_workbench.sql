begin;
select plan(26);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at) values
  ('90000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner-evidence@example.test','',now(),now(),now()),
  ('90000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','viewer-evidence@example.test','',now(),now(),now()),
  ('90000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','approver-evidence@example.test','',now(),now(),now()),
  ('90000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','other-owner@example.test','',now(),now(),now());
insert into public.organisations(id,name,slug) values
  ('91000000-0000-0000-0000-000000000001','Evidence test one','evidence-test-one'),
  ('91000000-0000-0000-0000-000000000002','Evidence test two','evidence-test-two');
insert into public.organisation_memberships(organisation_id,user_id,role) values
  ('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','owner'),
  ('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000002','viewer'),
  ('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000003','approver'),
  ('91000000-0000-0000-0000-000000000002','90000000-0000-0000-0000-000000000004','owner');
insert into public.sources(id,organisation_id,kind,name,storage_path,status,expected_sha256,expected_size_bytes,expected_mime_type,acknowledged_internal_non_regulated,ai_processing_consent,consented_at,created_by)
values ('92000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001','text','evidence.txt','91000000-0000-0000-0000-000000000001/evidence.txt','ready',repeat('a',64),10,'text/plain',true,true,now(),'90000000-0000-0000-0000-000000000001');
insert into public.source_items(id,organisation_id,source_id,content,content_hash,source_locator)
values ('93000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000001','Cycle time evidence',repeat('b',64),'{"type":"text_line","startLine":1,"endLine":1}');
insert into public.ingestion_runs(id,organisation_id,source_id,status,parser_version)
values ('94000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000001','completed','test');
insert into public.evidence_candidates(id,organisation_id,ingestion_run_id,source_item_id,claim_key,claim,value,confidence,source_locator) values
  ('95000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001','94000000-0000-0000-0000-000000000001','93000000-0000-0000-0000-000000000001','cycle.hours','Cycle takes eight hours','8'::jsonb,.900,'{"type":"text_line","startLine":1,"endLine":1}'),
  ('95000000-0000-0000-0000-000000000002','91000000-0000-0000-0000-000000000001','94000000-0000-0000-0000-000000000001','93000000-0000-0000-0000-000000000001','cycle.hours','Cycle takes six hours','6'::jsonb,.900,'{"type":"text_line","startLine":1,"endLine":1}');

select has_function('public','edit_opportunity_draft',array['uuid','uuid','uuid','integer','jsonb'],'versioned draft edit RPC exists');
select hasnt_table_privilege('authenticated','public.evidence_links','INSERT','authenticated cannot directly write evidence links');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"90000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select throws_ok($$ insert into public.evidence_links(organisation_id,evidence_id,relationship) values ('91000000-0000-0000-0000-000000000001','96000000-0000-0000-0000-000000000001','supports') $$,'42501',null,'direct authenticated linkage fails');
reset role;
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select throws_ok($$ select public.review_evidence_candidate('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000002','{}'::jsonb) $$,'42501',null,'viewer cannot review');
select throws_ok($$ select public.review_evidence_candidate('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000003','{}'::jsonb) $$,'42501',null,'approver cannot review');
select throws_ok($$ select public.review_evidence_candidate('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000004','{}'::jsonb) $$,'42501',null,'cross organisation owner cannot review');
select lives_ok($$ select public.review_evidence_candidate('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001',jsonb_build_object('candidate_id','95000000-0000-0000-0000-000000000001','decision','accepted','rationale','verified','reviewed_at',now(),'evidence_id','96000000-0000-0000-0000-000000000001')) $$,'owner review persists accepted evidence');
select lives_ok($$ select public.review_evidence_candidate('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001',jsonb_build_object('candidate_id','95000000-0000-0000-0000-000000000002','decision','accepted','rationale','verified','reviewed_at',now(),'evidence_id','96000000-0000-0000-0000-000000000002')) $$,'second accepted contradiction persists');
select throws_ok($$ select public.create_opportunity_draft('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001',jsonb_build_object('id','97000000-0000-0000-0000-000000000001','title','Cycle draft','problem_statement','Cycle is slow','evidence_ids',jsonb_build_array('96000000-0000-0000-0000-000000000001'))) $$,null,'Unresolved evidence conflict','one-sided conflict cannot create draft');
select lives_ok($$ select public.resolve_claim_conflict('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','cycle.hours','96000000-0000-0000-0000-000000000001','newer source wins') $$,'exact accepted evidence resolves conflict');
select results_eq($$ select selected_evidence_id from public.claim_conflict_resolutions where organisation_id='91000000-0000-0000-0000-000000000001' $$,$$ values ('96000000-0000-0000-0000-000000000001'::uuid) $$,'resolution persists exact selected evidence');
select throws_ok($$ update public.claim_conflict_resolutions set rationale='changed' where organisation_id='91000000-0000-0000-0000-000000000001' $$,'P0001',null,'conflict resolution is immutable');
select lives_ok($$ select public.create_opportunity_draft('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001',jsonb_build_object('id','97000000-0000-0000-0000-000000000001','title','Cycle draft','problem_statement','Cycle is slow','evidence_ids',jsonb_build_array('96000000-0000-0000-0000-000000000001'))) $$,'resolved evidence creates draft');
select is(public.edit_opportunity_draft('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','97000000-0000-0000-0000-000000000001',9,jsonb_build_object('title','Changed','problem_statement','Changed','evidence_ids',jsonb_build_array('96000000-0000-0000-0000-000000000001'))),null::jsonb,'stale version edit fails');
select lives_ok($$ select public.edit_opportunity_draft('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','97000000-0000-0000-0000-000000000001',1,jsonb_build_object('title','Edited cycle draft','problem_statement','Cycle is slow','business_unit','Operations','evidence_ids',jsonb_build_array('96000000-0000-0000-0000-000000000001'))) $$,'versioned edit persists');
select is((select count(*) from public.opportunity_draft_revisions where opportunity_draft_id='97000000-0000-0000-0000-000000000001'),1::bigint,'edit preserves immutable revision');
insert into public.use_cases(id,organisation_id,slug,title,business_unit,problem_statement,status,classification,owner_id)
values ('98000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001','cycle-target','Cycle target','Operations','Cycle is slow','draft','internal','90000000-0000-0000-0000-000000000001');
select lives_ok($$ select public.transition_opportunity_draft('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','97000000-0000-0000-0000-000000000001',2,'merged','98000000-0000-0000-0000-000000000001') $$,'merge persists terminal in-organisation target');
select results_eq($$ select status,promoted_use_case_id from public.opportunity_drafts where id='97000000-0000-0000-0000-000000000001' $$,$$ values ('merged'::text,'98000000-0000-0000-0000-000000000001'::uuid) $$,'merge stores terminal target');
select is((select count(*) from public.evidence_links where organisation_id='91000000-0000-0000-0000-000000000001'),1::bigint,'merge linkage persists');
select lives_ok($$ select public.create_opportunity_draft('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001',jsonb_build_object('id','97000000-0000-0000-0000-000000000002','title','Reject draft','problem_statement','No target','evidence_ids',jsonb_build_array('96000000-0000-0000-0000-000000000001'))) $$,'second draft supports rejection scenario');
select throws_ok($$ select public.transition_opportunity_draft('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','97000000-0000-0000-0000-000000000002',1,'rejected','98000000-0000-0000-0000-000000000001') $$,null,'Rejected drafts cannot have a target use case','reject target is denied');
select lives_ok($$ select public.transition_opportunity_draft('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','97000000-0000-0000-0000-000000000002',1,'rejected',null) $$,'reject persists without target');
select results_eq($$ select status,promoted_use_case_id from public.opportunity_drafts where id='97000000-0000-0000-0000-000000000002' $$,$$ values ('rejected'::text,null::uuid) $$,'reject stores no target');
select is((select count(*) from public.evidence_links where organisation_id='91000000-0000-0000-0000-000000000001'),1::bigint,'reject creates no linkage');
select is(public.transition_opportunity_draft('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','97000000-0000-0000-0000-000000000002',1,'rejected',null),null::jsonb,'stale reject transition fails');
select results_eq($$ select title,version from public.opportunity_drafts where id='97000000-0000-0000-0000-000000000001' $$,$$ values ('Edited cycle draft'::text,3::integer) $$,'reload reads merged persisted draft');

select * from finish();
rollback;
