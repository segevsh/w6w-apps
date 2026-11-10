import { webhookTrigger } from "../lib/triggers.ts";

/** File Uploaded: `project.imported`. */
const trigger = webhookTrigger({
  key: "file-imported",
  title: "File Uploaded",
  description:
    "Fires when a translation file is uploaded to a Lokalise project (one event per file). The run gets the event, project, branch, user, time and the import (file name, format, keys inserted, updated and skipped).",
  subscribeTo: ["project.imported"],
  accept: ["project.imported"],
  recordFrom: ["import"],
  sample: {
    event: "project.imported",
    projectId: "sample-project-id",
    projectName: "TheApp Project",
    branch: "master",
    userEmail: "ada@example.com",
    userName: "Ada Lovelace",
    createdAt: "2026-11-10 10:30:00",
    createdAtTimestamp: 1762770600,
    record: { filename: "ru.yml", format: "yml", inserted: 231, updated: 0, skipped: 0 },
    data: { event: "project.imported" },
  },
});

export default trigger;
