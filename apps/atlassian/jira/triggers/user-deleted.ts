import { webhookTrigger } from "../lib/triggers.ts";

const userDeleted = webhookTrigger({
  key: "user-deleted",
  title: "User Deleted",
  event: "user_deleted",
  description:
    "Fires when a user is deleted. The run gets the event name, the user and who did it, from a signed Jira webhook.",
  sample: {
    webhookEvent: "user_deleted",
    timestamp: 1762769400000,
    eventType: null,
    deliveryId: "a1b2c3d4-0000-4000-8000-000000000001",
    user: { accountId: "5b10a2844c20165700ede21g", displayName: "Mia Krystof" },
    issue: null,
    comment: null,
    project: null,
    changelog: null,
  },
});

export default userDeleted;
