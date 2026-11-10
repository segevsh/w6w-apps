import { webhookTrigger } from "../lib/triggers.ts";

/** Comment Added: `project.key.comment.added`. */
const trigger = webhookTrigger({
  key: "comment-added",
  title: "Comment Added",
  description:
    "Fires when a comment is added to a translation key in a Lokalise project. The run gets the event, project, branch, user, time and the comment text (the key it is on is in the full event data).",
  subscribeTo: ["project.key.comment.added"],
  accept: ["project.key.comment.added"],
  recordFrom: ["comment"],
  sample: {
    event: "project.key.comment.added",
    projectId: "sample-project-id",
    projectName: "TheApp Project",
    branch: "master",
    userEmail: "ada@example.com",
    userName: "Ada Lovelace",
    createdAt: "2026-11-10 10:30:00",
    createdAtTimestamp: 1762770600,
    record: { value: "My comment to test.title key" },
    data: { event: "project.key.comment.added" },
  },
});

export default trigger;
