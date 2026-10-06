import type { ActionDefinition } from "@w6w/types";
import { call, cursorList, list, pick } from "../lib/client.ts";
import { int, select, str, updatedAfter, updatedBefore } from "../lib/params.ts";

/** `POST /v2/notes/extended-search` (Mem API v2). */
type Input = Record<string, unknown>;

const noteExtendedSearch: ActionDefinition<Input> = {
  key: "note-extended-search",
  type: "search",
  resource: "note",
  title: "Extended Search Notes",
  description:
    "Search notes and the content attached to them (PDF, images, audio recordings, calendar events, emails), with relevance or date sorting and a cursor.",
  params: [
    str("query", "Query", { required: true }),
    int("limit", "Limit", { hint: "Page size, 1 to 100." }),
    str("next_page_cursor", "Cursor", { hint: "The nextPageCursor of the previous page." }),
    select("sort_by", "Sort by", ["RELEVANCE", "DATE"]),
    str("filter_by_collection_ids", "Collection IDs", {
      hint: "Comma-separated collection UUIDs to restrict to.",
    }),
    str("exclude_note_ids", "Exclude note IDs", {
      hint: "Comma-separated note UUIDs to leave out.",
    }),
    updatedAfter,
    updatedBefore,
  ],
  output: [
    { key: "items", type: "array", label: "Matching notes, each with any attachment_matches" },
    { key: "hasMore", type: "boolean", label: "Whether more results exist" },
    { key: "nextPageCursor", type: "string", label: "Cursor for the next page, or null" },
  ],

  execute(input, ctx) {
    const body = pick(input, [
      "query",
      "limit",
      "next_page_cursor",
      "sort_by",
      "filter_by_collection_ids",
      "exclude_note_ids",
      "filter_by_updated_after",
      "filter_by_updated_before",
    ]);
    const filter_by_collection_ids = list(input.filter_by_collection_ids);
    if (filter_by_collection_ids) body.filter_by_collection_ids = filter_by_collection_ids;
    const exclude_note_ids = list(input.exclude_note_ids);
    if (exclude_note_ids) body.exclude_note_ids = exclude_note_ids;
    return call(ctx, "POST", `/v2/notes/extended-search`, { body }).then(cursorList);
  },
};

export default noteExtendedSearch;
