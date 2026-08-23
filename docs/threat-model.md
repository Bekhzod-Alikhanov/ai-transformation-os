# Security and adversarial model

## Primary assets

- Tenant identity, membership, invitations, and roles.
- Source files, messages, events, evidence claims, and locators.
- Financial assumptions, committee assessments, pilot measurements, and decisions.
- Google OAuth refresh tokens and sync cursors.
- Immutable approval payloads, hashes, idempotency keys, and execution receipts.

## Boundaries and controls

| Threat                              | Control                                                                                                               |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Cross-tenant read/write             | `organisation_id` on every tenant row, RLS helper functions, pgTAP isolation tests                                    |
| Cross-tenant storage path           | Private bucket and first-segment organisation policy                                                                  |
| Service-role confused deputy        | Only signed Inngest events, verified OAuth state/webhooks, and reloaded organisation records reach service code       |
| Prompt injection in sources         | All external content is untrusted data; extraction agents have no action tools; outputs require schemas and citations |
| Unsupported AI arithmetic           | Deterministic financial, simulation, scoring, consensus, and recommendation engines own calculations                  |
| Hidden model reasoning              | Store concise rationale, objections, evidence, tool activity, usage, cost, and confidence only                        |
| OAuth token disclosure              | AES-256-GCM envelope, random 96-bit IV, auth tag, key version, server-only decryption, no token logging               |
| Forged Gmail notification           | Secret Pub/Sub push token plus strict envelope/data validation                                                        |
| Forged Calendar channel             | Verified `x-goog-channel-token`, channel/resource header validation                                                   |
| Stale OAuth/watch state             | Refresh token flow, history/sync cursors, daily renewal, scheduled fallback sync                                      |
| Approval replay or payload swap     | Immutable revision, current-version check, expiry, canonical payload hash, deterministic idempotency key              |
| Gmail content approval used to send | `gmail.create_draft` and `gmail.send` are distinct action and approval purposes                                       |
| Arbitrary automation execution      | Constrained Zod WHEN / IF / THEN / APPROVAL schema; no user code evaluation                                           |
| Fake provider status                | Adapter-only and disabled providers expose no capabilities and throw on use                                           |

## Operational requirements

- Keep the service-role key, OpenAI key, OAuth client secret, state/session secret, encryption keys, Inngest signing key, and webhook tokens in the deployment secret store.
- Rotate integration encryption keys through versioned envelopes; do not discard the previous key until all rows are re-encrypted.
- Use Pub/Sub OIDC verification in addition to the application push token where the Google project supports it.
- Restrict Inngest production signing keys to the production app and reject unsigned function calls.
- Export only immutable evidence-backed snapshots and mark Synthetic Replay in every generated asset.
- Run the checked-in secret scan and the deployment platform's secret scanner before release.
