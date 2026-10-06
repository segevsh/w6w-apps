import type { ActionDefinition } from "@w6w/types";
import { call, pageList, pickQuery } from "../lib/client.ts";
import { bool, dateFilterParams, limitParam, orderBy, pageParam, str } from "../lib/params.ts";

/** `GET /v2/notes` (Mem API v2). */
type Input = Record<string, unknown>;

const noteList: ActionDefinition<Input> = {
  key: "note-list",
  type: "read",
  resource: "note",
  title: "List Notes",
  description:
    "List notes with cursor pagination, newest-updated first by default. Optionally filter by collection, date range and content kind, and include full markdown content.",
  params: [
    pageParam,
    limitParam,
    orderBy,
    str("collection_id", "Collection ID", { hint: "Only notes linked to this collection (UUID)." }),
    ...dateFilterParams,
    bool("contains_open_tasks", "Has open tasks"),
    bool("contains_tasks", "Has tasks"),
    bool("contains_images", "Has images"),
    bool("contains_files", "Has files"),
    bool("include_note_content", "Include content", {
      hint: "Return each note's full markdown body, not just a snippet.",
    }),
  ],
  output: [
    { key: "items", type: "array", label: "Results of this page" },
    { key: "total", type: "number", label: "Total matching" },
    { key: "nextPage", type: "string", label: "Cursor for the next page, or null" },
    { key: "hasMore", type: "boolean", label: "Whether a further page exists" },
  ],

  execute(input, ctx) {
    return call(ctx, "GET", `/v2/notes`, {
      query: pickQuery(input, [
        "page",
        "limit",
        "order_by",
        "collection_id",
        "filter_by_created_after",
        "filter_by_created_before",
        "filter_by_updated_after",
        "filter_by_updated_before",
        "contains_open_tasks",
        "contains_tasks",
        "contains_images",
        "contains_files",
        "include_note_content",
      ]),
    }).then(pageList);
  },
};

export default noteList;
