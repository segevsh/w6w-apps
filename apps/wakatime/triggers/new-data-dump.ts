import { snapshotTrigger } from "../lib/snapshot.ts";
import dataDumpList from "../actions/data-dump-list.ts";

/**
 * `GET /api/v1/users/current/data_dumps` (https://wakatime.com/developers#data_dumps, 2026-11-10) lists the user's data exports: a
 * small collection (exports expire), so each check reads it whole and diffs the ids.
 */
export default snapshotTrigger({
  key: "new-data-dump",
  title: "New Data Export",
  description: "The run gets each data export newly requested on the account.",
  action: dataDumpList as never,
  input: () => ({}),
  items: (r) => (r as { data?: unknown[] } | undefined)?.data ?? [],
  idOf: (i) => String((i as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Export ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "type", type: "string", label: "Type (heartbeats or daily)" },
    { key: "created_at", type: "string", label: "Created" },
  ],
  sample: {
    id: "dump-sample",
    status: "Pending…",
    type: "daily",
    created_at: "2026-11-09T12:00:00Z",
  },
});
