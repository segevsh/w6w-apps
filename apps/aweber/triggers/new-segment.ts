import type { ActionDefinition } from "@w6w/types";
import segmentList from "../actions/segment-list.ts";
import { entries, snapshotTrigger } from "../lib/triggers.ts";

/**
 * Wraps `segment-list`. A list has few saved segments; one request (`ws.size` max 100) reads them all and only additions are emitted (https://api.aweber.com/, verified 2026-11-10).
 */
export default snapshotTrigger({
  key: "new-segment",
  title: "New Segment",
  description: "The run gets each newly created saved segment on the selected AWeber list.",
  action: segmentList as unknown as ActionDefinition,
  params: (segmentList.params ?? []).filter((p) => p.key === "accountId" || p.key === "listId"),
  input: (params) => ({ accountId: params.accountId, listId: params.listId, size: 100 }),
  rows: entries,
  keyOf: (row) => String((row as { id?: unknown }).id ?? ""),
  output: [
    { key: "change", type: "string", label: "Change (added)" },
    { key: "key", type: "string", label: "Segment ID" },
    { key: "values", type: "object", label: "Segment (id, name, is_split_test, self_link)" },
  ],
  sample: { change: "added", key: "55", values: { id: 55, name: "Engaged", is_split_test: false } },
});
