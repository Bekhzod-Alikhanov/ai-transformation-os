// Schema snapshot through migration 202608280001. Regenerate with:
// supabase gen types typescript --local > src/lib/supabase/database.types.ts
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type OrganisationRow = { id: string; name: string; slug: string; is_demo: boolean; created_at: string };
type ProfileRow = { id: string; display_name: string | null; created_at: string };
type MembershipRow = { organisation_id: string; user_id: string; role: Database["public"]["Enums"]["app_role"]; created_at: string };
type IntegrationRow = { id: string; organisation_id: string; provider: string; status: string; scopes: string[]; metadata: Json; connected_by: string | null; created_at: string; updated_at: string };
type SourceRow = {
  id: string;
  organisation_id: string;
  integration_id: string | null;
  kind: string;
  name: string;
  synthetic: boolean;
  storage_path: string | null;
  status: string;
  expected_sha256: string | null;
  expected_size_bytes: number | null;
  expected_mime_type: string | null;
  actual_sha256: string | null;
  actual_size_bytes: number | null;
  actual_mime_type: string | null;
  acknowledged_internal_non_regulated: boolean;
  ai_processing_consent: boolean;
  consented_at: string | null;
  completed_at: string | null;
  failure_code: string | null;
  metadata: Json;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
type SourceItemRow = {
  id: string;
  organisation_id: string;
  source_id: string;
  external_id: string | null;
  title: string | null;
  content: string | null;
  content_hash: string;
  source_locator: Json;
  locator_version: number;
  occurred_at: string | null;
  metadata: Json;
  created_at: string;
};
type EvidenceRow = { id: string; organisation_id: string; source_item_id: string | null; parent_evidence_id: string | null; claim_key: string; claim: string; value: Json; unit: string | null; provenance: Database["public"]["Enums"]["provenance_kind"]; confidence: number; source_locator: Json; extraction_method: string | null; valid_at: string | null; created_by: string | null; created_at: string };
type UseCaseRow = { id: string; organisation_id: string; slug: string; title: string; business_unit: string; problem_statement: string; summary: string | null; owner_id: string | null; status: string; classification: string; expected_annual_value: number | null; confidence: number | null; created_at: string; updated_at: string };
type PilotRow = { id: string; organisation_id: string; use_case_id: string; phase: string; status: string; plan: Json; recommendation: string | null; started_at: string | null; review_at: string | null; created_at: string };
type ApprovalRow = { id: string; organisation_id: string; action_type: string; system: string; status: Database["public"]["Enums"]["approval_status"]; current_revision: number; requester_agent_run_id: string | null; requested_by: string | null; assigned_to: string | null; risk: string; reason: string; evidence_ids: string[]; expires_at: string; created_at: string; updated_at: string };
type ApprovalRevisionRow = { id: string; organisation_id: string; approval_id: string; revision: number; payload: Json; payload_hash: string; edited_by: string | null; created_at: string };
type AuditEventRow = {
  id: string;
  organisation_id: string;
  actor_id: string | null;
  actor_type: string;
  action: string;
  target_type: string;
  target_id: string;
  payload_hash: string | null;
  metadata: Json;
  occurred_at: string;
};

type ProviderCredentialRow = {
  id: string;
  organisation_id: string;
  provider: string;
  status: string;
  ciphertext: string;
  iv: string;
  auth_tag: string;
  key_version: number;
  secret_suffix: string;
  scopes: string[];
  expires_at: string | null;
  last_validated_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type IngestionRunRow = {
  id: string;
  organisation_id: string;
  source_id: string;
  status: string;
  parser_version: string;
  item_count: number;
  warnings: string[];
  error_code: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

type EvidenceCandidateRow = {
  id: string;
  organisation_id: string;
  ingestion_run_id: string;
  source_item_id: string;
  claim_key: string;
  claim: string;
  value: Json;
  payload_version: number;
  unit: string | null;
  confidence: number;
  source_locator: Json;
  locator_version: number;
  status: string;
  created_at: string;
};

type EvidenceReviewRow = {
  id: string;
  organisation_id: string;
  candidate_id: string;
  decision: string;
  rationale: string;
  edited_value: Json;
  payload_version: number;
  resulting_evidence_id: string | null;
  reviewed_by: string;
  reviewed_at: string;
};

type OpportunityDraftRow = {
  id: string;
  organisation_id: string;
  title: string;
  problem_statement: string;
  business_unit: string | null;
  evidence_ids: string[];
  status: string;
  version: number;
  promoted_use_case_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type ExecutionReceiptRow = {
  id: string;
  organisation_id: string;
  operation: string;
  object_type: string;
  object_id: string;
  status: string;
  idempotency_key: string | null;
  external_id: string | null;
  created_at: string;
};

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};
type StrictInsert<Row, RequiredKeys extends keyof Row> = Pick<
  Row,
  RequiredKeys
> &
  Partial<Omit<Row, RequiredKeys>>;

export type Database = {
  public: {
    Tables: {
      organisations: Table<OrganisationRow, Omit<OrganisationRow, "id" | "created_at"> & { id?: string; created_at?: string }>;
      profiles: Table<ProfileRow, Omit<ProfileRow, "created_at"> & { created_at?: string }>;
      organisation_memberships: Table<MembershipRow, Omit<MembershipRow, "created_at"> & { created_at?: string }>;
      integrations: Table<IntegrationRow>;
      integration_secrets: Table<{ integration_id: string; organisation_id: string; ciphertext: string; iv: string; auth_tag: string; key_version: number; updated_at: string }>;
      connector_sync_states: Table<{ id: string; organisation_id: string; integration_id: string; resource: string; cursor: string | null; channel_id: string | null; channel_expiration: string | null; last_success_at: string | null; last_error: string | null }>;
      sources: Table<
        SourceRow,
        StrictInsert<SourceRow, "organisation_id" | "kind" | "name">
      >;
      source_items: Table<
        SourceItemRow,
        StrictInsert<
          SourceItemRow,
          | "organisation_id"
          | "source_id"
          | "content_hash"
          | "source_locator"
        >
      >;
      provider_credentials: Table<
        ProviderCredentialRow,
        StrictInsert<
          ProviderCredentialRow,
          | "organisation_id"
          | "provider"
          | "status"
          | "ciphertext"
          | "iv"
          | "auth_tag"
          | "key_version"
          | "secret_suffix"
        >
      >;
      ingestion_runs: Table<
        IngestionRunRow,
        StrictInsert<
          IngestionRunRow,
          "organisation_id" | "source_id" | "status" | "parser_version"
        >
      >;
      evidence_candidates: Table<
        EvidenceCandidateRow,
        StrictInsert<
          EvidenceCandidateRow,
          | "organisation_id"
          | "ingestion_run_id"
          | "source_item_id"
          | "claim_key"
          | "claim"
          | "confidence"
          | "source_locator"
        >
      >;
      evidence_reviews: Table<
        EvidenceReviewRow,
        StrictInsert<
          EvidenceReviewRow,
          | "organisation_id"
          | "candidate_id"
          | "decision"
          | "rationale"
          | "reviewed_by"
        >
      >;
      opportunity_drafts: Table<
        OpportunityDraftRow,
        StrictInsert<
          OpportunityDraftRow,
          "organisation_id" | "title" | "problem_statement"
        >
      >;
      execution_receipts: Table<
        ExecutionReceiptRow,
        StrictInsert<
          ExecutionReceiptRow,
          | "organisation_id"
          | "operation"
          | "object_type"
          | "object_id"
          | "status"
        >
      >;
      evidence: Table<EvidenceRow>;
      use_cases: Table<UseCaseRow>;
      use_case_scores: Table<{ id: string; organisation_id: string; use_case_id: string; version: number; weights: Json; dimensions: Json; overall_score: number; evidence_coverage: number; classification: string; created_at: string }>;
      assumptions: Table<{ id: string; organisation_id: string; use_case_id: string; key: string; label: string; value: Json; unit: string | null; provenance: Database["public"]["Enums"]["provenance_kind"]; confidence: number; evidence_id: string | null; version: number; created_at: string }>;
      financial_models: Table<{ id: string; organisation_id: string; use_case_id: string; version: number; inputs: Json; outputs: Json; formulas: Json; created_at: string }>;
      scenarios: Table<{ id: string; organisation_id: string; use_case_id: string | null; name: string; kind: string; patch: Json; results: Json; seed: number | null; created_by: string | null; created_at: string }>;
      workflows: Table<{ id: string; organisation_id: string; use_case_id: string; state: string; version: number; metrics: Json; created_at: string }>;
      workflow_nodes: Table<{ id: string; organisation_id: string; workflow_id: string; node_key: string; category: string; label: string; position: Json; metrics: Json }>;
      workflow_edges: Table<{ id: string; organisation_id: string; workflow_id: string; source_node_key: string; target_node_key: string; label: string | null; condition: Json }>;
      agent_runs: Table<{ id: string; organisation_id: string; use_case_id: string | null; agent_id: string | null; run_type: string; mode: string; status: Database["public"]["Enums"]["run_status"]; model: string | null; input: Json; output: Json; evidence_ids: string[]; input_tokens: number | null; output_tokens: number | null; estimated_cost: number | null; started_at: string | null; ended_at: string | null; error_code: string | null; created_at: string }>;
      agent_events: Table<{ id: string; organisation_id: string; run_id: string; sequence: number; event_type: string; summary: string; payload: Json; occurred_at: string }>;
      pilots: Table<PilotRow>;
      approvals: Table<ApprovalRow>;
      approval_revisions: Table<ApprovalRevisionRow>;
      automation_recipes: Table<{ id: string; organisation_id: string; name: string; enabled: boolean; definition: Json; created_by: string | null; created_at: string; updated_at: string }>;
      model_evaluations: Table<{ id: string; organisation_id: string; dataset_version: string; routing_policy: Json; model: string; metrics: Json; token_usage: Json; estimated_cost: number | null; latency_ms: number | null; created_at: string }>;
      audit_events: Table<AuditEventRow>;
    };
    Views: Record<string, never>;
    Functions: {
      is_org_member: { Args: { target_organisation_id: string }; Returns: boolean };
      has_org_role: { Args: { target_organisation_id: string; allowed_roles: Database["public"]["Enums"]["app_role"][] }; Returns: boolean };
      complete_source_upload: { Args: { target_organisation_id: string; target_source_id: string; completion_payload: Json }; Returns: Json };
      purge_source: { Args: { target_organisation_id: string; target_source_id: string; receipt_id: string; receipt_created_at: string }; Returns: Json };
      storage_object_organisation_id: { Args: { object_name: string }; Returns: string | null };
    };
    Enums: {
      app_role: "owner" | "admin" | "transformation_lead" | "analyst" | "approver" | "viewer";
      provenance_kind: "observed" | "user_provided" | "ai_inferred" | "assumed" | "calculated";
      approval_status: "pending" | "approved" | "executing" | "executed" | "rejected" | "expired" | "failed";
      run_status: "queued" | "running" | "requires_approval" | "completed" | "failed" | "cancelled";
    };
    CompositeTypes: Record<string, never>;
  };
};
