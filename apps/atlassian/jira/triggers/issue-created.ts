import { webhookTrigger } from "../lib/triggers.ts";

const issueCreated = webhookTrigger({
  key: "issue-created",
  title: "New Issue (Webhook)",
  event: "jira:issue_created",
  description:
    "Fires when an issue is created. The run gets the event name, the issue and who did it, from a signed Jira webhook.",
  sample: {
    webhookEvent: "jira:issue_created",
    timestamp: 1762769400000,
    eventType: "issue_created",
    deliveryId: "a1b2c3d4-0000-4000-8000-000000000001",
    user: { accountId: "5b10a2844c20165700ede21g", displayName: "Mia Krystof" },
    issue: { id: "10001", key: "ENG-42", fields: { summary: "Prepare release notes" } },
    comment: null,
    project: null,
    changelog: null,
  },
});

export default issueCreated;
