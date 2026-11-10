import { webhookTrigger } from "../lib/triggers.ts";

/** Language Added: `project.languages.added`. */
const trigger = webhookTrigger({
  key: "language-added",
  title: "Language Added",
  description:
    "Fires when a language is added to a Lokalise project. The run gets the event, project, branch, user, time and the list of added languages (id, ISO code, name).",
  subscribeTo: ["project.languages.added"],
  accept: ["project.languages.added"],
  sample: {
    event: "project.languages.added",
    projectId: "sample-project-id",
    projectName: "TheApp Project",
    branch: "master",
    userEmail: "ada@example.com",
    userName: "Ada Lovelace",
    createdAt: "2026-11-10 10:30:00",
    createdAtTimestamp: 1762770600,
    record: [{ id: 734, iso: "it", name: "Italian" }],
    data: { event: "project.languages.added" },
  },
});

export default trigger;
