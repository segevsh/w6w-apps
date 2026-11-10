import { webhookTrigger } from "../lib/triggers.ts";

/** A translation key is modified in a project (single or bulk). */
const trigger = webhookTrigger({
  key: "key-modified",
  title: "Key Modified",
  description:
    "Fires when a translation key is modified in a Lokalise project, including keys modified in bulk. The run gets the event, project, branch, user, time and the key or the list of keys.",
  subscribeTo: ["project.key.modified"],
  accept: ["project.key.modified", "project.keys.modified"],
  sample: {
    event: "project.key.modified",
    projectId: "sample-project-id",
    projectName: "TheApp Project",
    branch: "master",
    userEmail: "ada@example.com",
    userName: "Ada Lovelace",
    createdAt: "2026-11-10 10:30:00",
    createdAtTimestamp: 1762770600,
    record: { id: 16307699, name: "test.title", base_value: "Hello, world!", tags: ["home"] },
    data: { event: "project.key.modified" },
  },
});

export default trigger;
