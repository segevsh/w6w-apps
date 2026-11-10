import { webhookTrigger } from "../lib/triggers.ts";

const projectDeleted = webhookTrigger({
  key: "project-deleted",
  title: "Project Deleted",
  event: "project_deleted",
  description:
    "Fires when a project is deleted. The run gets the event name, the project and who did it, from a signed Jira webhook.",
  sample: {
    webhookEvent: "project_deleted",
    timestamp: 1762769400000,
    eventType: null,
    deliveryId: "a1b2c3d4-0000-4000-8000-000000000001",
    user: { accountId: "5b10a2844c20165700ede21g", displayName: "Mia Krystof" },
    issue: null,
    comment: null,
    project: { id: "10000", key: "ENG", name: "Engineering" },
    changelog: null,
  },
});

export default projectDeleted;
