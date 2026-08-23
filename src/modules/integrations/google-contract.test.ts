import { GoogleConnectorContract } from "./google-contract";

describe("GoogleConnectorContract", () => {
  it("requests incremental least-privilege scopes", () => {
    expect(GoogleConnectorContract.scopes("gmail", "read")).toEqual([
      "https://www.googleapis.com/auth/gmail.readonly",
    ]);
    expect(GoogleConnectorContract.scopes("gmail", "compose")).toContain(
      "https://www.googleapis.com/auth/gmail.compose",
    );
    expect(GoogleConnectorContract.scopes("calendar", "read")).toEqual([
      "https://www.googleapis.com/auth/calendar.events.readonly",
    ]);
    expect(GoogleConnectorContract.scopes("calendar", "write")).toContain(
      "https://www.googleapis.com/auth/calendar.events.owned",
    );
  });

  it("uses a distinct approval purpose for Gmail draft and send", () => {
    expect(GoogleConnectorContract.approvalPurpose("gmail.create_draft")).toBe(
      "create_gmail_draft",
    );
    expect(GoogleConnectorContract.approvalPurpose("gmail.send")).toBe(
      "send_gmail_message",
    );
  });
});
