import { webhookTrigger } from "../lib/triggers.ts";

/** Task Deleted: `project.task.deleted`. */
const trigger = webhookTrigger({
  key: "task-deleted",
  title: "Task Deleted",
  description:
    "Fires when a task is deleted in a Lokalise project. The run gets the event, project, branch, user, time and the task (id, type, title, due date, description).",
  subscribeTo: ["project.task.deleted"],
  accept: ["project.task.deleted"],
  sample: {
    event: "project.task.deleted",
    projectId: "sample-project-id",
    projectName: "TheApp Project",
    branch: "master",
    userEmail: "ada@example.com",
    userName: "Ada Lovelace",
    createdAt: "2026-11-10 10:30:00",
    createdAtTimestamp: 1762770600,
    record: {
      id: 5022,
      type: "translation",
      title: "Headings translation",
      due_date: "2026-12-01 00:00:00",
      description: "Task description",
    },
    data: { event: "project.task.deleted" },
  },
});

export default trigger;
