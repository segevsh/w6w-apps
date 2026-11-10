import { snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/check-list.ts";

// GET /v1/checks takes no sort or created-since filter (https://api.checklyhq.com/openapi.json,
// verified 2026-11-10), but an account holds a bounded set of checks: each check reads all
// pages (100 per page, 5000-row kit cap) and diffs the ids. check-group-checks-list returns a
// subset of these.
export default snapshotTrigger({
  key: "new-check",
  title: "New Check",
  description: "The run gets each newly created check (monitor).",
  async load(_params, ctx) {
    const rows = await action.execute({ returnAll: true }, ctx);
    return Array.isArray(rows) ? rows : [];
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Check ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "checkType", type: "string", label: "Check type" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "chk-101",
    name: "Homepage",
    checkType: "API",
    created_at: "2026-11-01T10:00:00.000Z",
  },
});
