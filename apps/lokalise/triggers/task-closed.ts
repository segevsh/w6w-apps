import { webhookTrigger } from "../lib/triggers.ts";

/** A task is closed in a project. */
const trigger = webhookTrigger({
  key: "task-closed",
  title: "Task Closed",
  description:
    "Fires when a task is closed in a Lokalise project, manually or on completion. The run gets the event, project, branch, user, time and the task (id, type, title, due date, description).",
  subscribeTo: ["project.task.closed"],
  accept: ["project.task.closed"],
  sample: {
    event: "project.task.closed",
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
    data: { event: "project.task.closed" },
  },
});

export default trigger;
