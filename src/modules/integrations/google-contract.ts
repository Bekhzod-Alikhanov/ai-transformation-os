export type GoogleConnector = "gmail" | "calendar";
export type GmailAction = "gmail.create_draft" | "gmail.send";

const scopes = {
  gmail: {
    read: ["https://www.googleapis.com/auth/gmail.readonly"],
    compose: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.compose",
    ],
  },
  calendar: {
    read: ["https://www.googleapis.com/auth/calendar.events.readonly"],
    write: [
      "https://www.googleapis.com/auth/calendar.events.readonly",
      "https://www.googleapis.com/auth/calendar.events.owned",
    ],
  },
} as const;

function googleScopes(
  connector: "gmail",
  capability: "read" | "compose",
): string[];
function googleScopes(
  connector: "calendar",
  capability: "read" | "write",
): string[];
function googleScopes(
  connector: GoogleConnector,
  capability: "read" | "compose" | "write",
): string[] {
  if (connector === "gmail")
    return [...scopes.gmail[capability === "compose" ? "compose" : "read"]];
  return [...scopes.calendar[capability === "write" ? "write" : "read"]];
}

export const GoogleConnectorContract = {
  scopes: googleScopes,
  approvalPurpose(action: GmailAction) {
    return action === "gmail.create_draft"
      ? ("create_gmail_draft" as const)
      : ("send_gmail_message" as const);
  },
  requirements: {
    gmailWatchRenewalHours: 24,
    calendarChannelRequiresSecretToken: true,
    fallbackIncrementalSync: true,
  },
};
