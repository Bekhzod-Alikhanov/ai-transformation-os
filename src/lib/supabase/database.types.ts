// Schema snapshot for migration 202608220001. Regenerate with:
// supabase gen types typescript --local > src/lib/supabase/database.types.ts
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type OrganisationRow = { id: string; name: string; slug: string; is_demo: boolean; created_at: string };
type MembershipRow = { organisation_id: string; user_id: string; role: Database["public"]["Enums"]["app_role"]; created_at: string };
type IntegrationRow = { id: string; organisation_id: string; provider: string; status: string; scopes: string[]; metadata: Json; connected_by: string | null; created_at: string; updated_at: string };
type SourceRow = { id: string; organisation_id: string; integration_id: string | null; kind: string; name: string; synthetic: boolean; storage_path: string | null; status: string; metadata: Json; created_by: string | null; created_at: string };
type EvidenceRow = { id: string; organisation_id: string; source_item_id: string | null; claim_key: string; claim: string; value: Json; unit: string | null; provenance: Database["public"]["Enums"]["provenance_kind"]; confidence: number; source_locator: Json; extraction_method: string | null; valid_at: string | null; created_by: string | null; created_at: string };
type UseCaseRow = { id: string; organisation_id: string; slug: string; title: string; business_unit: string; problem_statement: string; summary: string | null; owner_id: string | null; status: string; classification: string; expected_annual_value: number | null; confidence: number | null; created_at: string; updated_at: string };
type PilotRow = { id: string; organisation_id: string; use_case_id: string; phase: string; status: string; plan: Json; recommendation: string | null; started_at: string | null; review_at: string | null; created_at: string };
type ApprovalRow = { id: string; organisation_id: string; action_type: string; system: string; status: Database["public"]["Enums"]["approval_status"]; current_revision: number; requester_agent_run_id: string | null; requested_by: string | null; risk: string; reason: string; evidence_ids: string[]; expires_at: string; created_at: string; updated_at: string };
type ApprovalRevisionRow = { id: string; organisation_id: string; approval_id: string; revision: number; payload: Json; payload_hash: string; edited_by: string | null; created_at: string };
type AuditEventRow = { id: string; organisation_id: string; actor_id: string | null; actor_type: string; event_type: string; object_type: string; object_id: string | null; summary: string; payload: Json; occurred_at: string };

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      organisations: Table<OrganisationRow, Omit<OrganisationRow, "id" | "created_at"> & { id?: string; created_at?: string }>;
      organisation_memberships: Table<MembershipRow, Omit<MembershipRow, "created_at"> & { created_at?: string }>;
      integrations: Table<IntegrationRow>;
      integration_secrets: Table<{ integration_id: string; organisation_id: string; ciphertext: string; iv: string; auth_tag: string; key_version: number; updated_at: string }>;
      connector_sync_states: Table<{ id: string; organisation_id: string; integration_id: string; resource: string; cursor: string | null; channel_id: string | null; channel_expiration: string | null; last_success_at: string | null; last_error: string | null }>;
      sources: Table<SourceRow>;
      source_items: Table<{ id: string; organisation_id: string; source_id: string; external_id: string | null; title: string | null; content: string | null; content_hash: string; source_locator: Json; occurred_at: string | null; metadata: Json; created_at: string }>;
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
