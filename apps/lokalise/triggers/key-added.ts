import { webhookTrigger } from "../lib/triggers.ts";

/** A translation key is added to a project (single or bulk). */
const trigger = webhookTrigger({
  key: "key-added",
  title: "Key Added",
  description:
    "Fires when a translation key is added to a Lokalise project, including keys added in bulk. The run gets the event, project, branch, user, time and the key (id, name, base value, tags) or the list of keys.",
  subscribeTo: ["project.key.added"],
  accept: ["project.key.added", "project.keys.added"],
  sample: {
    event: "project.key.added",
    projectId: "sample-project-id",
    projectName: "TheApp Project",
    branch: "master",
    userEmail: "ada@example.com",
    userName: "Ada Lovelace",
    createdAt: "2026-11-10 10:30:00",
    createdAtTimestamp: 1762770600,
    record: { id: 16307699, name: "test.title", base_value: "Hello, world!", tags: ["home"] },
    data: { event: "project.key.added" },
  },
});

export default trigger;
