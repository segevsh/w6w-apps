import type { ActionDefinition } from "@w6w/types";
import {
  asOptionalJson,
  compact,
  type ListResult,
  ProductboardClient,
  toList,
} from "../lib/client.ts";
import { listOutput, pageCursorParam } from "../lib/params.ts";

/**
 * `POST /v2/notes/search` — full-text search across feedback.
 *
 * This is the endpoint that replaces v1's `term` parameter, and the vendor names
 * the replacement precisely: *"Full-text search across note content (the `term`
 * parameter in v1) is now supported via the `data.search.query` field on notes
 * search."*
 *
 * One documented gap remains and it is worth knowing before designing a
 * workflow around it: **filtering by tag is not available in v2.** v1's
 * `anyTag` / `allTags` have no v2 equivalent yet — the migration guide lists it
 * under "removed endpoints planned for a future release". Filter by type, id,
 * date range, fields, metadata or relationships instead, or keep that one
 * operation on v1.
 *
 * The body has three top-level keys and no others (`additionalProperties:
 * false`): `search` (`{query}`, max 255 characters, whitespace-only behaves as
 * filter-only), `filter` and `return`.
 */
interface Input {
  query?: string;
  filter?: unknown;
  returnFields?: string;
  fields?: string;
  pageCursor?: string;
}

const noteSearch: ActionDefinition<Input, ListResult> = {
  key: "note-search",
  type: "search",
  resource: "note",
  title: "Search notes",
  description:
    "Full-text search across note content, with structured filters. Replaces v1's `term` " +
    "parameter. Tag filtering is not yet available in v2.",
  params: [
    {
      key: "query",
      label: "Full-text query",
      type: "string",
      hint: "Maximum 255 characters. Leave empty for a filter-only search.",
    },
    {
      key: "filter",
      label: "Filter",
      type: "json",
      placeholder: '{"type": ["textNote"], "createdAt": {"from": "2026-01-01T00:00:00Z"}}',
      hint:
        "Keys: type, id (max 100), createdAt/updatedAt ranges, fields, metadata, relationships. " +
        "Different groups are ANDed; values within one group are ORed. There is no tag filter in " +
        "v2.",
    },
    {
      key: "returnFields",
      label: "Return fields",
      type: "string",
      hint: "Comma-separated. Sent as the body's `return.fields`.",
    },
    {
      key: "fields",
      label: "Response fields",
      type: "string",
      hint: "Comma-separated. Sent as the `fields[]` QUERY parameter — note the brackets, which " +
        "List notes does not use for the same idea.",
    },
    pageCursorParam,
  ],
  output: listOutput,

  execute(input, ctx) {
    const returnFields = (input.returnFields ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const data = compact({
      search: input.query ? { query: input.query } : undefined,
      filter: asOptionalJson<Record<string, unknown>>(input.filter, "Filter"),
      return: returnFields.length > 0 ? { fields: returnFields } : undefined,
    });
    return new ProductboardClient(ctx).list("/notes/search", {
      method: "POST",
      query: { pageCursor: input.pageCursor, "fields[]": toList(input.fields) },
      body: { data },
    });
  },
};

export default noteSearch;
