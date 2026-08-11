import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, type ListResult, ProductboardClient } from "../lib/client.ts";
import { listOutput, pageCursorParam } from "../lib/params.ts";

/**
 * `POST /v2/teams/search` — look up several teams at once.
 *
 * The batch form of `team-list`: `filter.id` and `filter.fields.name` /
 * `filter.fields.handle` each take up to 100 values, where the query string
 * takes one. String matching is case-insensitive, which the query-string form
 * does not promise.
 *
 * The body has exactly two keys — `filter` and `search`
 * (`additionalProperties: false`). Unlike the entity and note search bodies
 * there is **no `return`** here, so response shaping is not available on teams.
 */
interface Input {
  filter?: unknown;
  query?: string;
  pageCursor?: string;
}

const teamSearch: ActionDefinition<Input, ListResult> = {
  key: "team-search",
  type: "search",
  resource: "team",
  title: "Search teams",
  description: "Look up to 100 teams up at once by id, name or handle, case-insensitively.",
  params: [
    {
      key: "filter",
      label: "Filter",
      type: "json",
      placeholder: '{"fields": {"handle": ["platform", "growth"]}}',
      hint:
        "Keys: id (UUID or array, max 100) and fields (name, handle — each a string or an array " +
        "of up to 100). Matching is case-insensitive.",
    },
    {
      key: "query",
      label: "Search term",
      type: "string",
      hint: "Sent as the body's `search.query`.",
    },
    pageCursorParam,
  ],
  output: listOutput,

  execute(input, ctx) {
    const data = compact({
      filter: asOptionalJson<Record<string, unknown>>(input.filter, "Filter"),
      search: input.query ? { query: input.query } : undefined,
    });
    return new ProductboardClient(ctx).list("/teams/search", {
      method: "POST",
      query: { pageCursor: input.pageCursor },
      body: { data },
    });
  },
};

export default teamSearch;
