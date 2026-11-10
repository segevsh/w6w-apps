import { webhookTrigger } from "../lib/triggers.ts";

const issueDeleted = webhookTrigger({
  key: "issue-deleted",
  title: "Issue Deleted",
  event: "jira:issue_deleted",
  description:
    "Fires when an issue is deleted. The run gets the event name, the issue and who did it, from a signed Jira webhook.",
  sample: {
    webhookEvent: "jira:issue_deleted",
    timestamp: 1762769400000,
    eventType: "issue_deleted",
    deliveryId: "a1b2c3d4-0000-4000-8000-000000000001",
    user: { accountId: "5b10a2844c20165700ede21g", displayName: "Mia Krystof" },
    issue: { id: "10001", key: "ENG-42", fields: { summary: "Prepare release notes" } },
    comment: null,
    project: null,
    changelog: null,
  },
});

export default issueDeleted;
