import { webhookTrigger } from "../lib/triggers.ts";

/** Contributor Added: `project.contributor.added`. */
const trigger = webhookTrigger({
  key: "contributor-added",
  title: "Contributor Added",
  description:
    "Fires when a contributor is invited to a Lokalise project by an admin. The run gets the event, project, branch, user, time and the contributor (email).",
  subscribeTo: ["project.contributor.added"],
  accept: ["project.contributor.added"],
  sample: {
    event: "project.contributor.added",
    projectId: "sample-project-id",
    projectName: "TheApp Project",
    branch: "master",
    userEmail: "ada@example.com",
    userName: "Ada Lovelace",
    createdAt: "2026-11-10 10:30:00",
    createdAtTimestamp: 1762770600,
    record: { email: "grace@example.com" },
    data: { event: "project.contributor.added" },
  },
});

export default trigger;
