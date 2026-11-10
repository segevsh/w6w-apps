import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listConferenceRecords from "../actions/list-conference-records.ts";

export default pollFromListAction({
  key: "new-conference-record",
  title: "New Conference Record",
  description: "The run gets each newly started Google Meet conference record.",
  action: listConferenceRecords,
  input: () => ({ pageSize: 100 }),
  items: (result) => (result as { conferenceRecords?: unknown[] }).conferenceRecords ?? [],
  idOf: (item) => String((item as { name?: unknown }).name ?? ""),
  output: [
    { key: "name", type: "string", label: "Conference record name" },
    { key: "startTime", type: "string", label: "Start time" },
    { key: "endTime", type: "string", label: "End time" },
    { key: "space", type: "string", label: "Space" },
  ],
  sample: {
    name: "conferenceRecords/abc123",
    startTime: "2026-11-09T09:00:00Z",
    endTime: "2026-11-09T09:30:00Z",
    space: "spaces/abc123",
  },
  maxPages: 1,
});
