import { webhookTrigger } from "../lib/triggers.ts";

/** A translation is updated in a project (single or bulk). */
const trigger = webhookTrigger({
  key: "translation-updated",
  title: "Translation Updated",
  description:
    "Fires when a translation is updated in a Lokalise project, including translations updated in bulk. The run gets the event, project, branch, user, time, the language and key it belongs to, and the translation (new and previous value) or the list of translations.",
  subscribeTo: ["project.translation.updated"],
  accept: ["project.translation.updated", "project.translations.updated"],
  sample: {
    event: "project.translation.updated",
    projectId: "sample-project-id",
    projectName: "TheApp Project",
    branch: "master",
    userEmail: "ada@example.com",
    userName: "Ada Lovelace",
    createdAt: "2026-11-10 10:30:00",
    createdAtTimestamp: 1762770600,
    record: { id: 84835169, value: "Hello, %s!", previous_value: "Hi!", segment: 1 },
    data: { event: "project.translation.updated" },
  },
});

export default trigger;
