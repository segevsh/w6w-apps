import type { ActionDefinition } from "@w6w/types";
import tagList from "../actions/tag-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/**
 * Wraps `tag-list`. AWeber returns up to 500 tags per list, sorted by descending popularity, as a bare array of names; the array is compared with the previous check and only additions are emitted (https://api.aweber.com/, verified 2026-11-10).
 */
export default snapshotTrigger({
  key: "new-tag",
  title: "New Tag",
  description:
    "The run gets each tag that newly appears among the selected AWeber list's most popular tags.",
  action: tagList as unknown as ActionDefinition,
  params: (tagList.params ?? []).filter((p) => p.key === "accountId" || p.key === "listId"),
  input: (params) => ({ accountId: params.accountId, listId: params.listId }),
  rows: (result) => (result as { tags?: unknown[] }).tags ?? [],
  keyOf: (row) => String(row),
  output: [
    { key: "change", type: "string", label: "Change (added)" },
    { key: "key", type: "string", label: "Tag" },
    { key: "values", type: "string", label: "Tag name" },
  ],
  sample: { change: "added", key: "vip", values: "vip" },
});
