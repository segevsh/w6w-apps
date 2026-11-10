import { webhookTrigger } from "../lib/triggers.ts";

/** Any Jira webhook event, optionally narrowed by event name. */
const anyEvent = webhookTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires on any event a signed Jira webhook sends (sprints, boards, versions, worklogs, attachments, filters and the rest), optionally limited to the event names you list. The run gets the event name, the issue, comment, project or user it concerns, and the full delivery body (sprint, board, version, worklog and the rest) as payload.",
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
    payload: {
      webhookEvent: "sprint_started",
      timestamp: 1762769400000,
      sprint: { id: 7, name: "Sprint 7", state: "active" },
    },
  },
});

export default anyEvent;
