begin;
select plan(7);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'one@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'two@example.test', '', now(), now(), now());

insert into public.organisations (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Organisation One', 'organisation-one'),
  ('10000000-0000-0000-0000-000000000002', 'Organisation Two', 'organisation-two');
insert into public.organisation_memberships (organisation_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'analyst'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'approver');
insert into public.use_cases (organisation_id, slug, title, business_unit, problem_statement, status, classification) values
  ('10000000-0000-0000-0000-000000000001', 'one-case', 'One Case', 'Ops', 'Problem', 'candidate', 'quick_win'),
  ('10000000-0000-0000-0000-000000000002', 'two-case', 'Two Case', 'Ops', 'Problem', 'candidate', 'quick_win');
insert into public.approvals (id, organisation_id, action_type, system, risk, reason, expires_at)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'gmail.create_draft', 'Gmail', 'low', 'Test approval', now() + interval '1 day');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select results_eq(
  $$ select slug from public.use_cases order by slug $$,
  $$ values ('one-case'::text) $$,
  'tenant one cannot read tenant two use cases'
);
select ok(public.is_org_member('10000000-0000-0000-0000-000000000001'), 'membership helper accepts own organisation');
select is(public.is_org_member('10000000-0000-0000-0000-000000000002'), false, 'membership helper rejects another organisation');
select throws_ok(
  $$ insert into public.use_cases (organisation_id, slug, title, business_unit, problem_statement, status, classification) values ('10000000-0000-0000-0000-000000000002', 'cross-tenant', 'Cross Tenant', 'Ops', 'Problem', 'candidate', 'experiment') $$,
  '42501',
  null,
  'tenant one cannot write tenant two records'
);
select is_empty(
  $$ select * from public.integration_secrets $$,
  'integration secrets are never readable by authenticated clients'
);
select throws_ok(
  $$ update public.approvals set status = 'approved' where id = '20000000-0000-0000-0000-000000000001' $$,
  '42501',
  null,
  'analysts cannot execute or decide approvals'
);
select throws_ok(
  $$ insert into storage.objects (id, bucket_id, name, owner) values ('30000000-0000-0000-0000-000000000001', 'enterprise-sources', '10000000-0000-0000-0000-000000000002/cross-tenant.txt', '00000000-0000-0000-0000-000000000001') $$,
  '42501',
  null,
  'storage policies reject cross-tenant paths'
);

select * from finish();
rollback;
