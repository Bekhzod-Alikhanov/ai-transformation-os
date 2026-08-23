# Connector operations

## Common adapter

Every operational connector implements `ConnectorAdapter.sync(cursor)`, `propose(action)`, and `execute(approvedAction)`. Capabilities are explicit. A disabled adapter advertises none and throws on every operation.

## Gmail

- Read: request `gmail.readonly`.
- Draft/send upgrade: include `gmail.compose` only after the user enables the capability.
- Incremental sync: `users.watch` publishes to Pub/Sub; notifications carry only the account and history cursor. The sync job uses `users.history.list` and stores the next history ID.
- Renewal: watches are renewed daily. A 30-minute incremental fallback handles missed pushes.
- Draft: exact reviewed RFC 2822 payload is passed to `users.drafts.create`.
- Send: a distinct `gmail.send` approval is required before `users.messages.send`.

Gmail scopes are restricted and require Google verification for a public production application.

## Google Calendar

- Read: request `calendar.events.readonly`.
- Owned-calendar writes: add `calendar.events.owned` only after capability upgrade.
- Incremental sync: store `nextSyncToken`; handle channel notifications by scheduling a sync rather than trusting webhook content.
- Channel validation: require the configured `x-goog-channel-token` and known channel/resource IDs.
- Create event: execute the exact reviewed summary, description, location, times, time zones, and attendees through `events.insert`.

## Files

Files are operational in local and production modes. Supported extensions are PDF, DOCX, XLSX, CSV, TXT, MD, and Markdown. The upload boundary limits files to 25 MiB. Each parser returns source-native locators. Low-text PDFs stop at `requiresOcr`; no weak evidence is silently emitted.

## P2 entries

Salesforce, ServiceNow, additional providers, and generic MCP execution are not operational in this release. Their UI state is adapter-only or disabled, with no credentials, sync claims, or executable capability.
