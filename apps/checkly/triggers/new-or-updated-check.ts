import { snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/check-list.ts";

// Same full read as new-check (https://api.checklyhq.com/openapi.json, verified 2026-11-10);
// every check carries `updated_at`, so an edit changes its stamp and is emitted again.
export default snapshotTrigger({
  key: "new-or-updated-check",
  title: "New or Updated Check",
  description: "The run gets each check that is newly created or has been edited.",
  async load(_params, ctx) {
    const rows = await action.execute({ returnAll: true }, ctx);
    return Array.isArray(rows) ? rows : [];
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  stampOf: (item) => String((item as { updated_at?: unknown }).updated_at ?? ""),
  output: [
    { key: "id", type: "string", label: "Check ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "checkType", type: "string", label: "Check type" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "chk-101",
    name: "Homepage",
    checkType: "API",
    updated_at: "2026-11-09T10:00:00.000Z",
  },
});
