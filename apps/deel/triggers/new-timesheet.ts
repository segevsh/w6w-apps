import { snapshotList } from "../lib/snapshot.ts";
import timesheetList from "../actions/timesheet-list.ts";

export default snapshotList<{ statuses?: string }>({
  key: "new-timesheet",
  title: "New Timesheet",
  description:
    "The run gets each timesheet that newly appears with one of the watched statuses (default pending, i.e. submitted and awaiting review).",
  params: [{
    key: "statuses",
    label: "Statuses",
    type: "string",
    default: "pending",
    hint:
      "Comma-separated statuses to watch (blank = every status, which can exceed the 5000-row cap).",
  }],
  action: timesheetList,
  input: (p) => ({ statuses: p.statuses ?? "pending" }),
  output: [
    { key: "id", type: "string", label: "Timesheet ID" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: { id: "ts1", status: "pending" },
});
