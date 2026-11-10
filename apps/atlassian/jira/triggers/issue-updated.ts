import { webhookTrigger } from "../lib/triggers.ts";

const issueUpdated = webhookTrigger({
  key: "issue-updated",
  title: "Issue Updated",
  event: "jira:issue_updated",
  description:
    "Fires when an issue is updated (a field change, a transition, a comment). The run gets the event name, the issue and who did it, from a signed Jira webhook.",
  sample: {
    webhookEvent: "jira:issue_updated",
    timestamp: 1762769400000,
    eventType: "issue_updated",
    deliveryId: "a1b2c3d4-0000-4000-8000-000000000001",
    user: { accountId: "5b10a2844c20165700ede21g", displayName: "Mia Krystof" },
    issue: { id: "10001", key: "ENG-42", fields: { summary: "Prepare release notes" } },
    comment: null,
    project: null,
    changelog: {
      id: "10200",
      items: [{ field: "status", fromString: "To Do", toString: "In Progress" }],
    },
  },
});

export default issueUpdated;
