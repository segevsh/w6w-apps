import { snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/check-group-list.ts";

// GET /v1/check-groups takes no sort or created-since filter
// (https://api.checklyhq.com/openapi.json, verified 2026-11-10); an account holds a bounded set
// of groups, so each check reads all pages and diffs the ids.
export default snapshotTrigger({
  key: "new-check-group",
  title: "New Check Group",
  description: "The run gets each newly created check group.",
  async load(_params, ctx) {
    const rows = await action.execute({ returnAll: true }, ctx);
    return Array.isArray(rows) ? rows : [];
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Group ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: { id: 11, name: "Production", created_at: "2026-11-01T10:00:00.000Z" },
});
