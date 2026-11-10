import type { ActionDefinition } from "@w6w/types";
import listList from "../actions/list-list.ts";
import { entries, snapshotTrigger } from "../lib/triggers.ts";

/**
 * Wraps `list-list`. The account has few lists; one request (`ws.size` max 100) reads them all and only additions are emitted (https://api.aweber.com/, verified 2026-11-10).
 */
export default snapshotTrigger({
  key: "new-list",
  title: "New List",
  description: "The run gets each newly created AWeber list on the account.",
  action: listList as unknown as ActionDefinition,
  params: (listList.params ?? []).filter((p) => p.key === "accountId"),
  input: (params) => ({ accountId: params.accountId, size: 100 }),
  rows: entries,
  keyOf: (row) => String((row as { id?: unknown }).id ?? ""),
  output: [
    { key: "change", type: "string", label: "Change (added)" },
    { key: "key", type: "string", label: "List ID" },
    { key: "values", type: "object", label: "List (id, name, unique_list_id)" },
  ],
  sample: {
    change: "added",
    key: "101",
    values: { id: 101, name: "Newsletter", unique_list_id: "awlist101" },
  },
});
