import { snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/alert-channel-list.ts";

// GET /v1/alert-channels takes no sort or created-since filter
// (https://api.checklyhq.com/openapi.json, verified 2026-11-10); an account holds a bounded set
// of channels, so each check reads all pages and diffs the ids.
export default snapshotTrigger({
  key: "new-alert-channel",
  title: "New Alert Channel",
  description: "The run gets each newly created alert channel.",
  async load(_params, ctx) {
    const rows = await action.execute({ returnAll: true }, ctx);
    return Array.isArray(rows) ? rows : [];
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Channel ID" },
    { key: "type", type: "string", label: "Channel type" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: { id: 21, type: "EMAIL", created_at: "2026-11-01T10:00:00.000Z" },
});
