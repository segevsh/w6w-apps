import { newestFirstTrigger } from "../lib/triggers.ts";
import timeoffList from "../actions/timeoff-list.ts";

export default newestFirstTrigger({
  key: "new-timeoff",
  title: "New Time Off",
  description: "The run gets each newly created Float time off record (newest first).",
  action: timeoffList,
  sort: "-created",
  idKey: "timeoff_id",
  output: [
    { key: "timeoff_id", type: "number", label: "Time off ID" },
    { key: "timeoff_type_id", type: "number", label: "Time off type ID" },
    { key: "start_date", type: "string", label: "Start date" },
    { key: "end_date", type: "string", label: "End date" },
    { key: "people_ids", type: "array", label: "People assigned" },
    { key: "created", type: "string", label: "Created at" },
    { key: "modified", type: "string", label: "Last modified at" },
  ],
  sample: {
    timeoff_id: 601,
    timeoff_type_id: 1,
    start_date: "2026-12-24",
    end_date: "2026-12-26",
    people_ids: [201],
    created: "2026-11-09 12:00:00",
    modified: "2026-11-09 12:00:00",
  },
});
