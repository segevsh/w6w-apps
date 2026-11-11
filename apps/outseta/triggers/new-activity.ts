import action from "../actions/list-activities.ts";
import { recordFeed } from "../lib/triggers.ts";

export default recordFeed({
  key: "new-activity",
  title: "New Activity",
  description:
    "The run gets each new entry in the Outseta activity feed (newest first). Optionally limited to one entity or activity type.",
  action,
  output: [
    { key: "Uid", type: "string", label: "Activity Uid" },
    { key: "Title", type: "string", label: "Title" },
    { key: "Created", type: "string", label: "Created" },
  ],
  sample: { Uid: "n8Pq2Lw5", Title: "Ada Lovelace signed up", Created: "2026-11-10T09:00:00Z" },
});
