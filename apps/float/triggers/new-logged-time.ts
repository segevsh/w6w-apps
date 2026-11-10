import { newestFirstTrigger } from "../lib/triggers.ts";
import loggedTimeList from "../actions/logged-time-list.ts";

export default newestFirstTrigger({
  key: "new-logged-time",
  title: "New Logged Time",
  description: "The run gets each newly created Float logged time record (newest first).",
  action: loggedTimeList,
  sort: "-created",
  idKey: "logged_time_id",
  output: [
    { key: "logged_time_id", type: "string", label: "Logged time ID" },
    { key: "people_id", type: "number", label: "Person ID" },
    { key: "project_id", type: "number", label: "Project ID" },
    { key: "date", type: "string", label: "Date" },
    { key: "hours", type: "number", label: "Hours" },
    { key: "created", type: "string", label: "Created at" },
    { key: "modified", type: "string", label: "Last modified at" },
  ],
  sample: {
    logged_time_id: "lt-501",
    people_id: 201,
    project_id: 301,
    date: "2026-11-09",
    hours: 7.5,
    created: "2026-11-09 12:00:00",
    modified: "2026-11-09 12:00:00",
  },
});
