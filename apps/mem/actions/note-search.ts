import type { ActionDefinition } from "@w6w/types";
import { call, list, offsetList, pick, pickQuery } from "../lib/client.ts";
import { bool, dateFilterParams, int, str } from "../lib/params.ts";

/** `POST /v2/notes/search` (Mem API v2). */
type Input = Record<string, unknown>;

const noteSearch: ActionDefinition<Input> = {
  key: "note-search",
  type: "search",
  resource: "note",
  title: "Search Notes",
  description:
    "Relevance-ranked search over notes by a text query, with collection, date and content-kind filters. Paged by offset; pass snapshotId back to keep paging a stable result set.",
  params: [
    str("query", "Query", { required: true }),
    int("limit", "Limit", { hint: "Page size, 1 to 50." }),
    int("offset", "Offset", { hint: "Results to skip (default 0)." }),
    str("snapshot_id", "Snapshot ID", {
      hint: "The snapshotId of the previous page, to keep paging the same result set.",
    }),
    str("filter_by_collection_ids", "Collection IDs", {
      hint: "Comma-separated collection UUIDs to restrict to.",
    }),
    ...dateFilterParams,
    bool("filter_by_contains_open_tasks", "Has open tasks"),
    bool("filter_by_contains_tasks", "Has tasks"),
    bool("filter_by_contains_images", "Has images"),
    bool("filter_by_contains_files", "Has files"),
    bool("include_note_content", "Include content", {
      hint: "Return each note's full markdown body.",
    }),
  ],
  output: [
    { key: "items", type: "array", label: "Matching notes" },
    { key: "total", type: "number", label: "Total matches" },
    { key: "offset", type: "number", label: "Offset of this page" },
    { key: "limit", type: "number", label: "Page size" },
    { key: "hasMore", type: "boolean", label: "Whether more results exist" },
    { key: "snapshotId", type: "string", label: "Snapshot to pass to the next page" },
  ],

  execute(input, ctx) {
    const body = pick(input, [
      "query",
      "filter_by_collection_ids",
      "filter_by_created_after",
      "filter_by_created_before",
      "filter_by_updated_after",
      "filter_by_updated_before",
      "filter_by_contains_open_tasks",
      "filter_by_contains_tasks",
      "filter_by_contains_images",
      "filter_by_contains_files",
    ]);
    const filter_by_collection_ids = list(input.filter_by_collection_ids);
    if (filter_by_collection_ids) body.filter_by_collection_ids = filter_by_collection_ids;
    if (input.include_note_content === true) body.config = { include_note_content: true };
    return call(ctx, "POST", `/v2/notes/search`, {
      query: pickQuery(input, ["limit", "offset", "snapshot_id"]),
      body,
    }).then(offsetList);
  },
};

export default noteSearch;
