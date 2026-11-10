import { snapshotList } from "../lib/snapshot.ts";
import { csv, DeelClient } from "../lib/client.ts";

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
  // Vendor pager: `limit` + `offset` with `page.total_rows` (the list action sends `after_cursor`).
  list: (p, ctx) =>
    new DeelClient(ctx).requestAllOffset("/timesheets", {
      query: { statuses: csv(p.statuses ?? "pending") },
    }),
  output: [
    { key: "id", type: "string", label: "Timesheet ID" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: { id: "ts1", status: "pending" },
});
