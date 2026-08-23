-- Stable synthetic enterprise seed. All names, addresses, messages, events and values are fictional.
begin;

insert into public.organisations (id, name, slug, is_demo)
values ('00000000-0000-4000-8000-00000000a571', 'Aster Financial Group', 'aster-financial-group', true)
on conflict (id) do update set name = excluded.name, is_demo = true;

insert into public.integrations (id, organisation_id, provider, status, scopes, metadata) values
  ('00000000-0000-4000-8000-000000002001','00000000-0000-4000-8000-00000000a571','files','connected','{}','{"synthetic":true,"formats":["pdf","docx","xlsx","csv","txt","md"]}'),
  ('00000000-0000-4000-8000-000000002002','00000000-0000-4000-8000-00000000a571','gmail','available','{}','{"synthetic":true,"incremental_scopes":true}'),
  ('00000000-0000-4000-8000-000000002003','00000000-0000-4000-8000-00000000a571','calendar','available','{}','{"synthetic":true,"incremental_scopes":true}'),
  ('00000000-0000-4000-8000-000000002004','00000000-0000-4000-8000-00000000a571','salesforce','adapter','{}','{"operational":false,"p2":true}'),
  ('00000000-0000-4000-8000-000000002005','00000000-0000-4000-8000-00000000a571','servicenow','adapter','{}','{"operational":false,"p2":true}'),
  ('00000000-0000-4000-8000-000000002006','00000000-0000-4000-8000-00000000a571','enterprise_mcp','disabled','{}','{"operational":false,"p2":true}')
on conflict (organisation_id, provider) do update set status = excluded.status, metadata = excluded.metadata;

insert into public.sources (id, organisation_id, integration_id, kind, name, synthetic, status, metadata) values
  ('00000000-0000-4000-8000-000000003001','00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000002001','xlsx','Operations Baseline.xlsx',true,'ready','{"sheets":["Reporting","Support","Procurement"]}'),
  ('00000000-0000-4000-8000-000000003002','00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000002001','pdf','Client Reporting SOP.pdf',true,'ready','{"pages":12}'),
  ('00000000-0000-4000-8000-000000003003','00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000002002','gmail','Status update requests',true,'ready','{"threads":27}'),
  ('00000000-0000-4000-8000-000000003004','00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000002003','calendar','Client Delivery cadence',true,'ready','{"events":14}');

insert into public.source_items (id, organisation_id, source_id, external_id, title, content, content_hash, source_locator, occurred_at, metadata) values
  ('00000000-0000-4000-8000-000000004001','00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000003001','reporting-f18','Reporting effort baseline','Weekly preparation effort is recorded as 6 to 9 hours across the client delivery team.','seed-004001','{"type":"sheet_range","sheet":"Reporting","range":"F18"}','2026-08-01T12:00:00Z','{"synthetic":true}'),
  ('00000000-0000-4000-8000-000000004002','00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000003002','page-6','Reporting procedure','Analysts reconcile milestone, budget and risk data from CRM, project repository and finance export.','seed-004002','{"type":"page","page":6}','2026-07-15T12:00:00Z','{"synthetic":true}'),
  ('00000000-0000-4000-8000-000000004003','00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000003003','thread-101','Weekly status request — Northstar','Please send the current milestone summary and risks before the partner review.','seed-004003','{"type":"gmail_thread","thread_id":"thread-101","message_id":"msg-331"}','2026-08-20T14:15:00Z','{"synthetic":true}'),
  ('00000000-0000-4000-8000-000000004004','00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000003003','thread-102','Status data correction','The budget number in the first draft differs from the finance export. Please reconcile before circulation.','seed-004004','{"type":"gmail_thread","thread_id":"thread-102","message_id":"msg-339"}','2026-08-21T09:42:00Z','{"synthetic":true}'),
  ('00000000-0000-4000-8000-000000004005','00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000003004','event-201','Northstar weekly delivery review','Recurring client delivery status review with eight attendees.','seed-004005','{"type":"calendar_event","calendar_id":"primary","event_id":"event-201"}','2026-08-18T13:30:00Z','{"synthetic":true,"attendee_count":8}'),
  ('00000000-0000-4000-8000-000000004006','00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000003004','event-202','Reporting preparation block','Analyst calendar block reserved for collecting and reconciling weekly reporting inputs.','seed-004006','{"type":"calendar_event","calendar_id":"primary","event_id":"event-202"}','2026-08-17T14:00:00Z','{"synthetic":true,"duration_minutes":180}'),
  ('00000000-0000-4000-8000-000000004007','00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000003001','support-b11','Support adoption baseline','Pilot usage was observed for 44 percent of eligible support cases in the latest period.','seed-004007','{"type":"sheet_range","sheet":"Support","range":"B11"}','2026-08-22T11:00:00Z','{"synthetic":true}'),
  ('00000000-0000-4000-8000-000000004008','00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000003001','procurement-d9','Vendor review baseline','A standard vendor intelligence review takes 190 minutes before pilot assistance.','seed-004008','{"type":"sheet_range","sheet":"Procurement","range":"D9"}','2026-08-10T11:00:00Z','{"synthetic":true}');

insert into public.evidence (id, organisation_id, source_item_id, claim_key, claim, value, unit, provenance, confidence, source_locator, extraction_method, valid_at) values
  ('00000000-0000-4000-8000-000000005001','00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000004005','reporting_meetings','Client delivery reporting meetings recur 14 times per month','14','meetings/month','observed',0.94,'{"type":"calendar_query","period":"2026-07"}','calendar_count','2026-08-01T00:00:00Z'),
  ('00000000-0000-4000-8000-000000005002','00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000004003','status_threads','Status-request threads recur 27 times per month','27','threads/month','observed',0.91,'{"type":"gmail_query","period":"2026-07"}','thread_clustering','2026-08-01T00:00:00Z'),
  ('00000000-0000-4000-8000-000000005003','00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000004002','source_systems','Reporting requires reconciliation across three source systems','3','systems','observed',0.96,'{"type":"page","page":6}','document_extraction','2026-07-15T00:00:00Z'),
  ('00000000-0000-4000-8000-000000005004','00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000004001','prep_effort','Weekly reporting preparation takes 6 to 9 hours','{"minimum":6,"maximum":9}','hours/week','user_provided',0.74,'{"type":"sheet_range","sheet":"Reporting","range":"F18"}','spreadsheet_import','2026-08-01T00:00:00Z'),
  ('00000000-0000-4000-8000-000000005005','00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000004007','support_adoption','Support copilot adoption is 44 percent','0.44','ratio','observed',0.97,'{"type":"sheet_range","sheet":"Support","range":"B11"}','spreadsheet_import','2026-08-22T00:00:00Z');

insert into public.use_cases (id, organisation_id, slug, title, business_unit, problem_statement, summary, status, classification, expected_annual_value, confidence) values
  ('00000000-0000-4000-8000-000000001001','00000000-0000-4000-8000-00000000a571','client-status-reporting','Client Status Reporting Automation','Commercial Banking','Manual reporting requires fragmented aggregation and reconciliation.','Evidence-linked synthesis with deterministic reconciliation and human publication approval.','approved','big_bet',1100000,0.74),
  ('00000000-0000-4000-8000-000000001002','00000000-0000-4000-8000-00000000a571','support-copilot','Customer Support Resolution Copilot','Retail Banking','Resolution preparation is slow and inconsistent.',null,'pilot','big_bet',820000,0.72),
  ('00000000-0000-4000-8000-000000001003','00000000-0000-4000-8000-00000000a571','kyc-case-prep','KYC Case Preparation Agent','Risk & Compliance','Case preparation requires repeated evidence gathering.',null,'candidate','strategic_enabler',680000,0.69),
  ('00000000-0000-4000-8000-000000001004','00000000-0000-4000-8000-00000000a571','reg-reporting','Regulatory Reporting Assembly','Risk & Compliance','Reporting packages are assembled manually.',null,'candidate','quick_win',560000,0.76),
  ('00000000-0000-4000-8000-000000001005','00000000-0000-4000-8000-00000000a571','credit-memo','Commercial Credit Memo Assistant','Commercial Banking','Credit memo drafting is repetitive.',null,'candidate','big_bet',480000,0.65),
  ('00000000-0000-4000-8000-000000001006','00000000-0000-4000-8000-00000000a571','vendor-intelligence','Vendor Intelligence Review','Operations','Vendor reviews require slow document comparison.',null,'pilot','quick_win',450000,0.78),
  ('00000000-0000-4000-8000-000000001007','00000000-0000-4000-8000-00000000a571','wealth-briefing','Relationship Manager Briefing','Wealth Management','Briefings require fragmented source review.',null,'candidate','quick_win',400000,0.73),
  ('00000000-0000-4000-8000-000000001008','00000000-0000-4000-8000-00000000a571','complaints-triage','Complaint Triage and Routing','Retail Banking','Complaint intake routing is inconsistent.',null,'candidate','quick_win',370000,0.71),
  ('00000000-0000-4000-8000-000000001009','00000000-0000-4000-8000-00000000a571','finance-close','Finance Close Reconciliation','Finance','Close exceptions require manual reconciliation.',null,'pilot','quick_win',350000,0.77),
  ('00000000-0000-4000-8000-000000001010','00000000-0000-4000-8000-00000000a571','policy-retrieval','Policy Retrieval and Guidance','People & Change','Employees struggle to find current policy guidance.',null,'candidate','strategic_enabler',320000,0.68),
  ('00000000-0000-4000-8000-000000001011','00000000-0000-4000-8000-00000000a571','it-incident','IT Incident Resolution Assistant','Technology','Incident responders repeat diagnostic work.',null,'pilot','quick_win',300000,0.74),
  ('00000000-0000-4000-8000-000000001012','00000000-0000-4000-8000-00000000a571','audit-sampling','Continuous Audit Sampling','Risk & Compliance','Audit sampling is periodic and manual.',null,'pilot','experiment',280000,0.63),
  ('00000000-0000-4000-8000-000000001013','00000000-0000-4000-8000-00000000a571','collections-next-action','Collections Next-Best Action','Retail Banking','Collections prioritisation lacks consistent evidence.',null,'candidate','experiment',260000,0.61),
  ('00000000-0000-4000-8000-000000001014','00000000-0000-4000-8000-00000000a571','forecast-narrative','Forecast Narrative Generator','Finance','Forecast narratives repeat deterministic analysis.',null,'candidate','quick_win',240000,0.75),
  ('00000000-0000-4000-8000-000000001015','00000000-0000-4000-8000-00000000a571','contract-obligations','Contract Obligation Extraction','Operations','Contract obligations are tracked manually.',null,'candidate','quick_win',230000,0.7),
  ('00000000-0000-4000-8000-000000001016','00000000-0000-4000-8000-00000000a571','talent-mobility','Internal Talent Mobility Matching','People & Change','Internal skill matching is fragmented.',null,'candidate','experiment',220000,0.58),
  ('00000000-0000-4000-8000-000000001017','00000000-0000-4000-8000-00000000a571','meeting-load','Meeting Load Optimisation','People & Change','Recurring meeting load is not measured.',null,'candidate','quick_win',200000,0.71),
  ('00000000-0000-4000-8000-000000001018','00000000-0000-4000-8000-00000000a571','model-docs','Model Documentation Assistant','Risk & Compliance','Model documentation is expensive to maintain.',null,'candidate','strategic_enabler',180000,0.69),
  ('00000000-0000-4000-8000-000000001019','00000000-0000-4000-8000-00000000a571','cash-exceptions','Cash Exception Investigation','Operations','Exception research spans multiple systems.',null,'candidate','experiment',170000,0.57),
  ('00000000-0000-4000-8000-000000001020','00000000-0000-4000-8000-00000000a571','client-onboarding','Client Onboarding Coordinator','Commercial Banking','Onboarding handoffs create delays.',null,'candidate','experiment',150000,0.6),
  ('00000000-0000-4000-8000-000000001021','00000000-0000-4000-8000-00000000a571','marketing-copy','Personalised Marketing Copy','Retail Banking','Evidence for incremental value is weak.',null,'deferred','defer',140000,0.31),
  ('00000000-0000-4000-8000-000000001022','00000000-0000-4000-8000-00000000a571','trader-autopilot','Autonomous Trading Recommendation','Wealth Management','The proposal would automate a regulated client-facing decision.',null,'stopped','stop',120000,0.67),
  ('00000000-0000-4000-8000-000000001023','00000000-0000-4000-8000-00000000a571','hr-policy-bot','Generic HR Policy Chatbot','People & Change','The proposal duplicates existing retrieval capabilities.',null,'deferred','defer',110000,0.28),
  ('00000000-0000-4000-8000-000000001024','00000000-0000-4000-8000-00000000a571','expense-approval','Autonomous Expense Approval','Finance','The proposal removes required financial approval controls.',null,'stopped','stop',90000,0.51),
  ('00000000-0000-4000-8000-000000001025','00000000-0000-4000-8000-00000000a571','code-migration','Legacy Code Migration Assistant','Technology','Migration work lacks a stable test baseline.',null,'candidate','experiment',80000,0.55),
  ('00000000-0000-4000-8000-000000001026','00000000-0000-4000-8000-00000000a571','board-sentiment','Board Sentiment Predictor','Finance','The proposed output is not decision-valid and lacks evidence.',null,'stopped','stop',60000,0.18),
  ('00000000-0000-4000-8000-000000001027','00000000-0000-4000-8000-00000000a571','office-concierge','AI Office Concierge','Operations','Expected value is low and evidence is insufficient.',null,'deferred','defer',40000,0.22)
on conflict (organisation_id, slug) do update set title=excluded.title, status=excluded.status, classification=excluded.classification, expected_annual_value=excluded.expected_annual_value, confidence=excluded.confidence;

insert into public.evidence_links (organisation_id, evidence_id, use_case_id, relationship)
select '00000000-0000-4000-8000-00000000a571', evidence_id, '00000000-0000-4000-8000-000000001001', 'supports'
from (values ('00000000-0000-4000-8000-000000005001'::uuid),('00000000-0000-4000-8000-000000005002'::uuid),('00000000-0000-4000-8000-000000005003'::uuid),('00000000-0000-4000-8000-000000005004'::uuid)) as refs(evidence_id)
on conflict do nothing;

insert into public.use_case_scores (organisation_id, use_case_id, version, weights, dimensions, overall_score, evidence_coverage, classification)
select organisation_id, id, 1, '{"strategicAlignment":0.15,"economicValue":0.2,"userImpact":0.1,"feasibility":0.15,"dataReadiness":0.1,"timeToValue":0.1,"changeReadiness":0.1,"risk":0.1}', jsonb_build_object('score_source','synthetic_seed'), case slug when 'client-status-reporting' then 78 when 'support-copilot' then 82 when 'trader-autopilot' then 29 else 65 end, coalesce(confidence,0.5), classification
from public.use_cases where organisation_id='00000000-0000-4000-8000-00000000a571'
on conflict (use_case_id, version) do nothing;

insert into public.financial_models (organisation_id, use_case_id, version, inputs, outputs, formulas) values
('00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000001001',1,'{"labour":{"frequency":52,"minutes":490,"loaded_cost":92,"reduction":0.84,"adoption":0.72,"utilisation":0.83,"redeployability":0.47},"discount_rate":0.1}','{"gross_annual_benefit":1420000,"annual_run_cost":320000,"net_annual_benefit":1100000,"first_year_roi":1.68,"payback_months":4.5,"three_year_npv":2325000}','{"labour":"frequency × minutes ÷ 60 × loaded cost × reduction × adoption × utilisation × redeployability"}')
on conflict (use_case_id, version) do nothing;

insert into public.pilots (id, organisation_id, use_case_id, phase, status, plan, recommendation, started_at, review_at) values
('00000000-0000-4000-8000-000000006001','00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000001002','61-90','active','{"realised_run_rate":710000,"target_adoption":0.70,"actual_adoption":0.44}','scale_with_conditions','2026-05-25','2026-09-16'),
('00000000-0000-4000-8000-000000006002','00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000001004','61-90','active','{"realised_run_rate":420000,"target_adoption":0.65,"actual_adoption":0.71}','scale','2026-05-28','2026-09-12'),
('00000000-0000-4000-8000-000000006003','00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000001006','31-60','active','{"realised_run_rate":310000,"target_adoption":0.60,"actual_adoption":0.63}','scale','2026-07-01','2026-09-30'),
('00000000-0000-4000-8000-000000006004','00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000001009','31-60','active','{"realised_run_rate":220000,"target_adoption":0.70,"actual_adoption":0.59}','fix','2026-07-04','2026-10-02'),
('00000000-0000-4000-8000-000000006005','00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000001011','0-30','active','{"realised_run_rate":150000,"target_adoption":0.55,"actual_adoption":0.57}','scale_with_conditions','2026-08-02','2026-10-31'),
('00000000-0000-4000-8000-000000006006','00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000001012','0-30','active','{"realised_run_rate":90000,"target_adoption":0.50,"actual_adoption":0.28}','pause','2026-08-05','2026-11-03')
on conflict (id) do nothing;

insert into public.kpis (id, organisation_id, pilot_id, key, label, unit, target, direction) values
('00000000-0000-4000-8000-000000007001','00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000006001','adoption','Eligible cases using copilot','ratio',0.70,'increase'),
('00000000-0000-4000-8000-000000007002','00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000006002','adoption','Eligible reports using assembly','ratio',0.65,'increase'),
('00000000-0000-4000-8000-000000007003','00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000006003','adoption','Eligible reviews using assistant','ratio',0.60,'increase'),
('00000000-0000-4000-8000-000000007004','00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000006004','adoption','Eligible close exceptions assisted','ratio',0.70,'increase'),
('00000000-0000-4000-8000-000000007005','00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000006005','adoption','Eligible incidents assisted','ratio',0.55,'increase'),
('00000000-0000-4000-8000-000000007006','00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000006006','adoption','Eligible samples automated','ratio',0.50,'increase')
on conflict (pilot_id,key) do nothing;

insert into public.measurements (organisation_id, kpi_id, value, measured_at, evidence_id) values
('00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000007001',0.44,'2026-08-22T12:00:00Z','00000000-0000-4000-8000-000000005005'),
('00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000007002',0.71,'2026-08-22T12:00:00Z',null),
('00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000007003',0.63,'2026-08-22T12:00:00Z',null),
('00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000007004',0.59,'2026-08-22T12:00:00Z',null),
('00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000007005',0.57,'2026-08-22T12:00:00Z',null),
('00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000007006',0.28,'2026-08-22T12:00:00Z',null);

insert into public.approvals (id, organisation_id, action_type, system, status, current_revision, risk, reason, expires_at) values
('00000000-0000-4000-8000-000000008001','00000000-0000-4000-8000-00000000a571','gmail.create_draft','Gmail','pending',1,'low','Create pilot kickoff email draft','2026-08-24T00:00:00Z'),
('00000000-0000-4000-8000-000000008002','00000000-0000-4000-8000-00000000a571','calendar.create_event','Google Calendar','pending',1,'medium','Create steering committee meeting','2026-08-24T00:00:00Z'),
('00000000-0000-4000-8000-000000008003','00000000-0000-4000-8000-00000000a571','use_case.change_stage','Transformation OS','pending',1,'medium','Move use case to pilot','2026-08-24T00:00:00Z'),
('00000000-0000-4000-8000-000000008004','00000000-0000-4000-8000-00000000a571','pack.publish','Board repository','pending',1,'high','Publish executive steering pack','2026-08-24T00:00:00Z')
on conflict (id) do nothing;

insert into public.approval_revisions (organisation_id, approval_id, revision, payload, payload_hash) values
('00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000008001',1,'{"to":["client-status-pilot@aster.example"],"cc":[],"subject":"90-day pilot kickoff","bodyText":"Synthetic reviewed draft content."}','seed-hash-8001'),
('00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000008002',1,'{"calendarId":"primary","summary":"Client Reporting PoV steering committee","start":{"dateTime":"2026-08-25T09:30:00-04:00","timeZone":"America/New_York"},"end":{"dateTime":"2026-08-25T10:15:00-04:00","timeZone":"America/New_York"},"attendees":[]}','seed-hash-8002'),
('00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000008003',1,'{"useCaseId":"00000000-0000-4000-8000-000000001001","from":"candidate","to":"pilot"}','seed-hash-8003'),
('00000000-0000-4000-8000-00000000a571','00000000-0000-4000-8000-000000008004',1,'{"snapshot":"august-v4","audience":"executive-steering"}','seed-hash-8004')
on conflict (approval_id,revision) do nothing;

insert into public.automation_recipes (id, organisation_id, name, enabled, definition) values
('00000000-0000-4000-8000-000000009001','00000000-0000-4000-8000-00000000a571','Weekly Value Review',true,'{"when":{"type":"schedule","cron":"0 8 * * 5"},"conditions":[{"field":"active_pilots","operator":"gt","value":0}],"then":{"action":"draft_value_review","parameters":{}},"approval":"required"}'),
('00000000-0000-4000-8000-000000009002','00000000-0000-4000-8000-00000000a571','New Signal Detection',true,'{"when":{"type":"event","event":"evidence/approved"},"conditions":[{"field":"confidence_delta","operator":"gte","value":0.1}],"then":{"action":"recalculate_opportunity_confidence","parameters":{}},"approval":"notify"}'),
('00000000-0000-4000-8000-000000009003','00000000-0000-4000-8000-00000000a571','Pilot Health Monitor',true,'{"when":{"type":"schedule","cron":"0 7 * * *"},"conditions":[{"field":"gate_status","operator":"eq","value":"outside"}],"then":{"action":"create_owner_task","parameters":{}},"approval":"required"}'),
('00000000-0000-4000-8000-000000009004','00000000-0000-4000-8000-00000000a571','Steering Committee Prep',true,'{"when":{"type":"event","event":"meeting/in_48_hours"},"conditions":[],"then":{"action":"generate_steering_pack","parameters":{}},"approval":"required"}')
on conflict (id) do nothing;

commit;
