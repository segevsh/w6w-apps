import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/list-records.ts";

const KEPT = new Set(["object", "filter"]);

/**
 * `POST /v2/objects/{object}/records/query` with an explicit
 * `sorts: [{ direction: "desc", attribute: "created_at" }]` (the record's `created_at` is Attio's
 * creation stamp, https://docs.attio.com/rest-api/endpoint-reference/records/list-records, 2026-11-10;
 * sort format: https://docs.attio.com/rest-api/guides/filtering-and-sorting). The sort is sent
 * explicitly, never left to the default order. Records have no update stamp, so there is no
 * new-or-updated sibling. `search-records` returns the same records (fuzzy, eventually consistent).
 */
const trigger = pollFromListAction({
  key: "new-record",
  title: "New Record",
  description:
    "The run gets each newly created record of the chosen object (people, companies, deals or a custom object), optionally narrowed by a filter.",
  action: action as unknown as ActionDefinition,
  input: (params) => ({
    ...params,
    sorts: [{ direction: "desc", attribute: "created_at" }],
    limit: 50,
  }),
  items: (result) => (result as { records?: unknown[] }).records ?? [],
  idOf: (item) => String((item as { id?: { record_id?: string } }).id?.record_id),
  params: (action.params ?? []).filter((p) => KEPT.has(p.key)),
  output: [
    { key: "id", type: "object", label: "Record ID ({ workspace_id, object_id, record_id })" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "values", type: "object", label: "Attribute values, keyed by attribute slug" },
  ],
  sample: {
    id: { workspace_id: "w_1", object_id: "o_1", record_id: "r_1" },
    created_at: "2026-11-09T10:00:00.000000000Z",
    values: { name: [{ full_name: "Ada Lovelace" }] },
  },
  maxPages: 1,
});

export default trigger;
