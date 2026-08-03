import type { ActionDefinition } from "@w6w/types";
import {
  AttioClient,
  compact,
  OBJECT_PARAM,
  PAGE_OUTPUT,
  pageBody,
  pageParams,
  QUERY_DEFAULT_LIMIT,
} from "../lib/client.ts";
import { withFlatValues } from "../lib/values.ts";

interface Input {
  object: string;
  filter?: unknown;
  filterViewId?: string;
  sorts?: unknown;
  limit?: number;
  offset?: number;
}

/**
 * `POST /v2/objects/{object}/records/query` — the authoritative record listing.
 *
 * ## A list that is a POST, and why that is not a mistake
 *
 * Attio's filter language is a nested JSON tree with logical operators, path
 * traversal into related records, and per-attribute-field comparisons. None of
 * that survives a query string, so the listing endpoint takes a body. `limit`
 * and `offset` go in the body too — the Pagination guide shows exactly this
 * shape: "For a `POST` endpoint using a body, your requests would look like
 * this: `POST /v2/objects/people/records/query` `{"limit": 50, "offset": 50}`".
 *
 * ## Filters: two syntaxes, and the shorthand is a trap for `$not`
 *
 * The shorthand is bare equality — `{"name": "John Smith", "email_addresses":
 * "john@smith.com"}` — with `$and` implied between attributes. The verbose form
 * expresses the rest: nine comparison operators (`$eq`, `$in`, `$not_empty`,
 * `$contains`, `$starts_with`, `$ends_with`, `$lt`, `$lte`, `$gt`, `$gte`) and
 * three logical ones (`$and`, `$or`, `$not`).
 *
 * The one thing worth saying at the form, because it is a real dead end
 * otherwise: **there is no `$ne`.** Verbatim from the guide — "Attio doesn't
 * offer negative operators, for example there is no inverse of `$eq` like
 * `$neq`. Instead, filters should be wrapped using the `$not` operator." So
 * "deals not in progress" is `{"$not": {"stage": "In Progress"}}`.
 *
 * Which operators are legal depends on the ATTRIBUTE TYPE, not on the value:
 * `$contains` works on text, domain, email, location, name and phone, and on
 * nothing else. Sorting takes `{direction, attribute, field?}` or a `path` form
 * that traverses record references.
 *
 * ## `filter` and `filter_view_id` are mutually exclusive
 *
 * Both are declared "Cannot be used together with" the other. `filter_view_id`
 * borrows a saved view's filter configuration and, notably, *only* that: "sorts,
 * limits, and offsets are applied independently and are not taken from the view.
 * All attributes are returned regardless of which attributes are visible in the
 * view."
 *
 * ## Results are strongly consistent, unlike Search Records
 *
 * This is the endpoint to use when correctness matters. Search Records is fuzzy
 * and its own docs warn its results "are eventually consistent. For results
 * which are guaranteed to be up to date, please use the record query endpoint
 * instead."
 *
 * This endpoint is also one of the two subject to Attio's **score-based** rate
 * limit: complex filters over large objects cost more, and a single query can be
 * refused for being too expensive. Narrow the filter before widening the limit.
 */
const listRecords: ActionDefinition<Input> = {
  key: "list-records",
  type: "search",
  resource: "record",
  title: "List Records",
  description:
    "Query records on any object — people, companies, deals or a custom object — with Attio's " +
    "full filter and sort language. Strongly consistent; use this rather than Search Records " +
    "when the result has to be up to date.",
  params: [
    OBJECT_PARAM,
    {
      key: "filter",
      label: "Filter",
      type: "json",
      hint: 'Shorthand equality, e.g. `{"name": "Ada Lovelace"}`, or the verbose tree, e.g. ' +
        '`{"$and": [{"name": {"$contains": "LTD"}}, {"$not": {"domains": {"root_domain": ' +
        '"apple.com"}}}]}`. Operators: `$eq` `$in` `$not_empty` `$contains` `$starts_with` ' +
        "`$ends_with` `$lt` `$lte` `$gt` `$gte`, combined with `$and` `$or` `$not`. **There is " +
        "no `$ne`** — negate by wrapping in `$not`. Which operators an attribute accepts depends " +
        "on its type. Cannot be combined with a filter view.",
    },
    {
      key: "sorts",
      label: "Sorts",
      type: "json",
      advanced: true,
      hint:
        'JSON array, e.g. `[{"direction": "asc", "attribute": "name", "field": "last_name"}]`. ' +
        "`field` picks a sub-property of a composite value. A `path` form sorts by a related " +
        'record\'s attribute: `[{"direction": "asc", "path": [["people", "company"], ' +
        '["companies", "name"]]}]`.',
    },
    {
      key: "filterViewId",
      label: "Filter view id",
      type: "string",
      advanced: true,
      hint: "UUID of a saved view whose filter configuration to reuse. **Mutually exclusive with " +
        "Filter.** Only the filter is borrowed — sorts, limit and offset are applied " +
        "independently, and every attribute is returned regardless of what the view shows.",
    },
    ...pageParams({ defaultLimit: QUERY_DEFAULT_LIMIT }),
  ],
  output: [
    ...PAGE_OUTPUT,
    {
      key: "records_flat",
      type: "array",
      label: "The same records with a `values_flat` scalar map added",
    },
  ],

  async execute(input, ctx) {
    const body = compact({
      filter: input.filter,
      filter_view_id: input.filterViewId,
      sorts: input.sorts,
      ...pageBody(input),
    });

    const { records } = await new AttioClient(ctx).list(
      `/objects/${encodeURIComponent(input.object)}/records/query`,
      { method: "POST", body },
    );
    return { records, records_flat: records.map(withFlatValues) };
  },
};

export default listRecords;
