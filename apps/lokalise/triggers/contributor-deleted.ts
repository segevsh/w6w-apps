import { webhookTrigger } from "../lib/triggers.ts";

/** Contributor Removed: `project.contributor.deleted`. */
const trigger = webhookTrigger({
  key: "contributor-deleted",
  title: "Contributor Removed",
  description:
    "Fires when a contributor is removed from a Lokalise project. The run gets the event, project, branch, user, time and the contributor (email).",
  subscribeTo: ["project.contributor.deleted"],
  accept: ["project.contributor.deleted"],
  sample: {
    event: "project.contributor.deleted",
    projectId: "sample-project-id",
    projectName: "TheApp Project",
    branch: "master",
    userEmail: "ada@example.com",
    userName: "Ada Lovelace",
    createdAt: "2026-11-10 10:30:00",
    createdAtTimestamp: 1762770600,
    record: { email: "grace@example.com" },
    data: { event: "project.contributor.deleted" },
  },
});

export default trigger;
