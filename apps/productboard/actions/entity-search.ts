import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, type ListResult, ProductboardClient } from "../lib/client.ts";
import { listOutput, pageCursorParam } from "../lib/params.ts";

/**
 * `POST /v2/entities/search` — the filter form the query string cannot express.
 *
 * `entity-list` covers the flat filters. This covers the rest, and the
 * difference is real rather than stylistic: the query string can only say
 * `status[name]=In Progress`, one value, one field. The search body takes
 * **arrays of alternatives per field** and reaches custom fields by UUID:
 *
 * ```json
 * { "filter": {
 *     "type": ["initiative"],
 *     "id": ["133275f0-…", "7a26ba09-…"],
 *     "fields": {
 *       "archived": false,
 *       "status": [{"name": "In Progress"}, {"name": "At Risk"}],
 *       "owner":  [{"email": "john@doe.com"}, {"email": "jane@doe.com"}]
 *     },
 *     "relationships": { "parent": [{"id": "318de52f-…"}] }
 *   },
 *   "return": { "fields": ["name", "status", "owner"] } }
 * ```
 *
 * `filter` and `return` are the only two top-level keys the schema allows
 * (`additionalProperties: false`), so anything else is a 400.
 *
 * Note the shape mismatch with the URL form: here the type filter is
 * `filter.type`, an array *inside the body*, not the repeated `type[]` query
 * key. Copying a query string into this body does not work.
 */
interface Input {
  filter?: unknown;
  returnFields?: string;
  pageCursor?: string;
}

const entitySearch: ActionDefinition<Input, ListResult> = {
  key: "entity-search",
  type: "search",
  resource: "entity",
  title: "Search entities",
  description:
    "Filter entities by several alternative values per field, by custom field UUID, and by " +
    "relationship — the cases the List entities query string cannot express.",
  params: [
    {
      key: "filter",
      label: "Filter",
      type: "json",
      placeholder: '{"type": ["initiative"], "fields": {"status": [{"name": "In Progress"}]}}',
      hint:
        "Keys: type (array of entity types), id (array of UUIDs), fields (object of field id → " +
        "array of alternatives), relationships, metadata. A custom field is keyed by its UUID — " +
        "run Get entity configuration to find it.",
    },
    {
      key: "returnFields",
      label: "Return fields",
      type: "string",
      placeholder: "name,status,owner",
      hint: "Comma-separated. Sent as the body's `return.fields`, which shapes each result. " +
        "Leave empty for the default projection.",
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
      filter: asOptionalJson<Record<string, unknown>>(input.filter, "Filter"),
      return: returnFields.length > 0 ? { fields: returnFields } : undefined,
    });
    return new ProductboardClient(ctx).list("/entities/search", {
      method: "POST",
      query: { pageCursor: input.pageCursor },
      body: { data },
    });
  },
};

export default entitySearch;
