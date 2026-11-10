import { webhookTrigger } from "../lib/triggers.ts";

/** Any Jira webhook event, optionally narrowed by event name. */
const anyEvent = webhookTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires on any event a signed Jira webhook sends (sprints, boards, versions, worklogs, attachments, filters and the rest), optionally limited to the event names you list. The run gets the event name and the issue, comment, project or user it concerns.",
  sample: {
    webhookEvent: "sprint_started",
    timestamp: 1762769400000,
    eventType: null,
    deliveryId: "a1b2c3d4-0000-4000-8000-000000000002",
    user: null,
    issue: null,
    comment: null,
    project: null,
    changelog: null,
  },
});

export default anyEvent;
