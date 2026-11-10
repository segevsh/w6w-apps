import { webhookTrigger } from "../lib/triggers.ts";

/** Translation Reviewed: `project.translation.proofread`. */
const trigger = webhookTrigger({
  key: "translation-proofread",
  title: "Translation Reviewed",
  description:
    "Fires when a translation is marked or unmarked as reviewed in a Lokalise project, including in bulk. The run gets the event, project, branch, user, time and the translation (value, reviewed flag) or list.",
  subscribeTo: ["project.translation.proofread"],
  accept: ["project.translation.proofread", "project.translations.proofread"],
  recordFrom: ["translation", "translations"],
  sample: {
    event: "project.translation.proofread",
    projectId: "sample-project-id",
    projectName: "TheApp Project",
    branch: "master",
    userEmail: "ada@example.com",
    userName: "Ada Lovelace",
    createdAt: "2026-11-10 10:30:00",
    createdAtTimestamp: 1762770600,
    record: { id: 84835169, value: "Hello, %s!", is_proofread: true, segment: 1 },
    data: { event: "project.translation.proofread" },
  },
});

export default trigger;
