import { webhookTrigger } from "../lib/triggers.ts";

/** Any Lokalise project event, optionally narrowed to a list. */
const trigger = webhookTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires on any Lokalise project event you subscribe to: leave Events empty for every event the webhook API accepts, or list event names (for example project.key.comment.added) to receive only those. The run gets the event name, project, branch, user, time, the event's own object (key, translation, task, comment, contributor, languages or import) and the full event data.",
  subscribeTo: [],
  accept: [],
  any: true,
  sample: {
    event: "project.snapshot",
    projectId: "sample-project-id",
    projectName: "TheApp Project",
    branch: null,
    userEmail: "ada@example.com",
    userName: "Ada Lovelace",
    createdAt: "2026-11-10 10:30:00",
    createdAtTimestamp: 1762770600,
    record: null,
    data: {
      event: "project.snapshot",
      project: { id: "sample-project-id", name: "TheApp Project" },
    },
  },
});

export default trigger;
