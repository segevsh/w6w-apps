import { webhookTrigger } from "../lib/triggers.ts";

/** Key Deleted: `project.keys.deleted`. */
const trigger = webhookTrigger({
  key: "key-deleted",
  title: "Key Deleted",
  description:
    "Fires when translation keys are removed from a Lokalise project, one at a time, in bulk or through the API. The run gets the event, project, branch, user, time and the list of removed keys (id, name, base value, file names).",
  subscribeTo: ["project.keys.deleted"],
  accept: ["project.keys.deleted"],
  sample: {
    event: "project.keys.deleted",
    projectId: "sample-project-id",
    projectName: "TheApp Project",
    branch: "master",
    userEmail: "ada@example.com",
    userName: "Ada Lovelace",
    createdAt: "2026-11-10 10:30:00",
    createdAtTimestamp: 1762770600,
    record: [{ id: 16307699, name: "test.title_modified", base_value: "Welcome!" }],
    data: { event: "project.keys.deleted" },
  },
});

export default trigger;
