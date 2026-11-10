import { webhookTrigger } from "../lib/triggers.ts";

const commentUpdated = webhookTrigger({
  key: "comment-updated",
  title: "Comment Updated",
  event: "comment_updated",
  description:
    "Fires when a comment is edited. The run gets the event name, the comment and who did it, from a signed Jira webhook.",
  sample: {
    webhookEvent: "comment_updated",
    timestamp: 1762769400000,
    eventType: null,
    deliveryId: "a1b2c3d4-0000-4000-8000-000000000001",
    user: { accountId: "5b10a2844c20165700ede21g", displayName: "Mia Krystof" },
    issue: null,
    comment: { id: "10042", body: "Looks good to me" },
    project: null,
    changelog: null,
  },
});

export default commentUpdated;
