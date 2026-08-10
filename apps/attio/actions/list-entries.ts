import type { ActionDefinition } from "@w6w/types";
import {
  AttioClient,
  compact,
  LIST_PARAM,
  PAGE_OUTPUT,
  pageBody,
  pageParams,
  QUERY_DEFAULT_LIMIT,
} from "../lib/client.ts";
import { withFlatValues } from "../lib/values.ts";

interface Input {
  list: string;
  filter?: unknown;
  filterViewId?: string;
  sorts?: unknown;
  limit?: number;
  offset?: number;
}

/**
 * `POST /v2/lists/{list}/entries/query` — entries on one list.
 *
 * Same filter and sort language as List Records, same body-borne
 * `limit`/`offset`, same 500 default, same score-based rate limiting. What is
 * different is what you can filter *on*.
 *
 * ## `parent_record` — filtering an entry by the record behind it
 *
 * The feature that makes this endpoint more than a listing. From the Filtering
 * and sorting guide: "Note that we're using a special attribute called
 * `parent_record` that we can use for filtering any list entry." Combined with
 * `path`, it drills from the entry into its parent record and onward through
 * that record's references:
 *
 *     { "path": [["candidates", "parent_record"], ["people", "email_addresses"]],
 *       "constraints": { "email_domain": "apple.com" } }
 *
 * — "entries on the Candidates list whose person has an @apple.com address". The
 * guide's own worked example goes two hops further, to "entries where the
 * candidate works at the same company as Steve Jobs".
 *
 * Note the shape change: a path filter uses `path` + `constraints`, not the
 * attribute-keyed form. Both go in the same `filter` field.
 *
 * ## Entries carry their own attribute values
 *
 * A list may define attributes the underlying object does not — a stage that
 * only exists on the Sales list, say. Those come back as `entry_values`, keyed
 * by the LIST's attribute slugs, and `values_flat` is derived from them.
 */
const listEntries: ActionDefinition<Input> = {
  key: "list-entries",
  type: "search",
  resource: "entry",
  title: "List Entries",
  description:
    "Query entries on a list with the same filter and sort language as List Records, plus the " +
    "`parent_record` path filter that lets you select entries by properties of the record behind " +
    "them.",
  params: [
    LIST_PARAM,
    {
      key: "filter",
      label: "Filter",
      type: "json",
      hint:
        'Attribute filters as on List Records, e.g. `{"stage": "In Progress"}`. Or a path filter ' +
        'that drills through the parent record: `{"path": [["candidates", "parent_record"], ' +
        '["people", "email_addresses"]], "constraints": {"email_domain": "apple.com"}}`. ' +
        "Cannot be combined with a filter view.",
    },
    {
      key: "sorts",
      label: "Sorts",
      type: "json",
      advanced: true,
      hint:
        'JSON array, e.g. `[{"direction": "asc", "attribute": "stage"}]`, or a `path` sort such ' +
        'as `[{"direction": "asc", "path": [["sales", "parent_record"], ["companies", ' +
        '"name"]]}]`.',
    },
    {
      key: "filterViewId",
      label: "Filter view id",
      type: "string",
      advanced: true,
      hint:
        "UUID of a saved view whose filter to reuse. **Mutually exclusive with Filter.** Sorts, " +
        "limit and offset are still applied independently of the view.",
    },
    ...pageParams({ defaultLimit: QUERY_DEFAULT_LIMIT }),
  ],
  output: [
    ...PAGE_OUTPUT,
    {
      key: "records_flat",
      type: "array",
      label: "The same entries with a `values_flat` scalar map added",
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
      `/lists/${encodeURIComponent(input.list)}/entries/query`,
      { method: "POST", body },
    );
    return { records, records_flat: records.map(withFlatValues) };
  },
};

export default listEntries;
