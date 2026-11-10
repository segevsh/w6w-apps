import { snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/maintenance-window-list.ts";

// GET /v1/maintenance-windows filters only on startsAt/endsAt, not creation
// (https://api.checklyhq.com/openapi.json, verified 2026-11-10); an account holds a bounded set
// of windows, so each check reads all pages and diffs the ids.
export default snapshotTrigger({
  key: "new-maintenance-window",
  title: "New Maintenance Window",
  description: "The run gets each newly scheduled maintenance window.",
  async load(_params, ctx) {
    const rows = await action.execute({ returnAll: true }, ctx);
    return Array.isArray(rows) ? rows : [];
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Window ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "startsAt", type: "string", label: "Starts at" },
    { key: "endsAt", type: "string", label: "Ends at" },
  ],
  sample: {
    id: 31,
    name: "Deploy",
    startsAt: "2026-11-10T22:00:00.000Z",
    endsAt: "2026-11-10T23:00:00.000Z",
  },
});
