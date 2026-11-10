import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/list-entries.ts";

const KEPT = new Set(["list", "filter"]);

/**
 * `POST /v2/lists/{list}/entries/query` with an explicit
 * `sorts: [{ direction: "desc", attribute: "created_at" }]` (an entry's `created_at` is its creation
 * stamp, https://docs.attio.com/rest-api/endpoint-reference/entries/list-entries, 2026-11-10; sort
 * format: https://docs.attio.com/rest-api/guides/filtering-and-sorting). The sort is sent explicitly,
 * never left to the default order. `list-record-entries` returns the same entries per record.
 */
const trigger = pollFromListAction({
  key: "new-list-entry",
  title: "New List Entry",
  description:
    "The run gets each record newly added to the chosen list (an entry), optionally narrowed by a filter.",
  action: action as unknown as ActionDefinition,
  input: (params) => ({
    ...params,
    sorts: [{ direction: "desc", attribute: "created_at" }],
    limit: 50,
  }),
  items: (result) => (result as { records?: unknown[] }).records ?? [],
  idOf: (item) => String((item as { id?: { entry_id?: string } }).id?.entry_id),
  params: (action.params ?? []).filter((p) => KEPT.has(p.key)),
  output: [
    { key: "id", type: "object", label: "Entry ID ({ workspace_id, list_id, entry_id })" },
    { key: "parent_record_id", type: "string", label: "Record behind the entry" },
    { key: "parent_object", type: "string", label: "Object of that record" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "entry_values", type: "object", label: "The entry's own attribute values" },
  ],
  sample: {
    id: { workspace_id: "w_1", list_id: "l_1", entry_id: "e_1" },
    parent_record_id: "r_1",
    parent_object: "people",
    created_at: "2026-11-09T10:00:00.000000000Z",
    entry_values: {},
  },
  maxPages: 1,
});

export default trigger;
