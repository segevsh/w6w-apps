import { PAGE_SIZE, snapshotList } from "../lib/snapshot.ts";
import onCallList from "../actions/on-call-list.ts";

export default snapshotList({
  key: "new-on-call-calendar",
  title: "New On-call Calendar",
  description: "The run gets each newly created on-call calendar.",
  action: onCallList,
  input: (_params, page) => ({ page, per_page: PAGE_SIZE }),
  output: [
    { key: "id", type: "string", label: "Calendar ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "default_calendar", type: "boolean", label: "Default calendar" },
  ],
  sample: { id: "7001", type: "on_call_calendar", name: "Tier 2", default_calendar: false },
});
