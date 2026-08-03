import type { ActionDefinition } from "@w6w/types";
import { MetabaseClient, toList } from "../lib/client.ts";
import { limitParam, offsetParam, pageOutput, searchModelOptions } from "../lib/params.ts";

/**
 * `GET /api/search` — search across everything in the instance.
 *
 * This is the action to reach for whenever `question-list`, `dashboard-list` or
 * `collection-list` would return too much: it is the only listing endpoint in
 * this app that takes `limit` and `offset`, and the only one that can filter by
 * text. Verified live: `?q=order&limit=2&offset=1` returned
 * `{"limit":2,"offset":1,"total":20,"data":[…2 items…]}`.
 *
 * ## `models` REPEATS. Comma-joining it is a hard 400
 *
 * This is the one trap in this action and it is worth stating precisely.
 * Metabase's schema types `models` as an array of enum strings, and the wire
 * form is repetition:
 *
 *     ?models=card&models=dashboard        → 200, "models": ["dashboard","card"]
 *     ?models=card,dashboard               → 400
 *       {"specific-errors":{"models":[["should be either \"dashboard\", … or
 *         \"card\", received: \"card,dashboard\""]]}}
 *
 * Both verified on the wire on 2026-08-03. The comma form is not silently
 * ignored and does not fall back to unfiltered — it fails the whole request, so
 * a client that comma-joins is broken for every multi-type search. `lib/client.ts`
 * appends array values rather than setting one joined value, and
 * `tests/lib/client.test.ts` pins that behaviour.
 *
 * ## `q` is optional
 *
 * Verified: `?models=dashboard&limit=3` with no `q` at all returns 200 and
 * enumerates dashboards. So this action doubles as the paginated lister the
 * type-specific endpoints do not provide, which is why `q` is not marked
 * required even though it is the obvious primary input.
 *
 * ## The `models` vocabulary is not the collection one
 *
 * Search can find a `database`, `segment`, `action` or `indexed-entity`, none of
 * which can be *inside* a collection; a collection can hold a `pulse`, `snippet`
 * or `timeline`, none of which search indexes. The two enums are transcribed
 * separately in `lib/params.ts` rather than shared.
 */
interface Input {
  q?: string;
  /** A multiselect arrives as an array; a single selection may arrive as a string. */
  models?: string[] | string;
  collection?: number;
  tableDbId?: number;
  archived?: boolean;
  searchNativeQuery?: boolean;
  filterItemsInPersonalCollection?: string;
  limit?: number;
  offset?: number;
}

const search: ActionDefinition<Input> = {
  key: "search",
  type: "search",
  resource: "search",
  title: "Search",
  description:
    "Search questions, dashboards, collections, models, tables and more. The only paginated " +
    "listing endpoint Metabase offers.",
  params: [
    {
      key: "q",
      label: "Query",
      type: "string",
      hint:
        "Free text. Optional — omit it and filter by type alone to page through everything of a " +
        "given kind.",
    },
    {
      key: "models",
      label: "Types",
      type: "multiselect",
      options: searchModelOptions,
      hint: "Restrict to these entity types. Leave empty to search everything.",
    },
    {
      key: "collection",
      label: "Collection ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Restrict to one collection. Numeric ids only here — `root` is not accepted.",
    },
    {
      key: "tableDbId",
      label: "Database ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Restrict table results to one database.",
    },
    {
      key: "searchNativeQuery",
      label: "Search inside SQL",
      type: "boolean",
      default: false,
      hint:
        "Also match against the text of native queries — how to find every question referencing " +
        "a given table or column.",
    },
    {
      key: "filterItemsInPersonalCollection",
      label: "Personal collections",
      type: "select",
      options: [
        { value: "all", label: "Include" },
        { value: "only", label: "Only personal collections" },
        { value: "only-mine", label: "Only my personal collection" },
        { value: "exclude", label: "Exclude all personal collections" },
        { value: "exclude-others", label: "Exclude other people's" },
      ],
      hint: "Verbatim from the endpoint's enum.",
    },
    {
      key: "archived",
      label: "Archived only",
      type: "boolean",
      default: false,
    },
    limitParam,
    offsetParam,
  ],
  output: pageOutput,

  execute(input, ctx) {
    return new MetabaseClient(ctx).request("/api/search", {
      query: {
        q: input.q,
        // Repeated, not comma-joined — the comma form is a 400. See above.
        models: toList(input.models),
        collection: input.collection,
        table_db_id: input.tableDbId,
        archived: input.archived,
        search_native_query: input.searchNativeQuery,
        filter_items_in_personal_collection: input.filterItemsInPersonalCollection,
        limit: input.limit,
        offset: input.offset,
      },
    });
  },
};

export default search;
