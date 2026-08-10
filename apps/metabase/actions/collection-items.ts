import type { ActionDefinition } from "@w6w/types";
import { MetabaseClient, toList } from "../lib/client.ts";
import {
  collectionItemModelOptions,
  collectionSortOptions,
  limitParam,
  offsetParam,
  pageOutput,
  pinnedStateOptions,
} from "../lib/params.ts";

/**
 * `GET /api/collection/{id}/items` — list what is inside a collection.
 *
 * This is the browse action: given a collection, what questions, dashboards,
 * models and sub-collections are in it? It is also one of only two endpoints in
 * this app that genuinely paginate.
 *
 * ## `root` is a valid id, and it is why this param is a string
 *
 * `GET /api/collection/root/items` lists the top level ("Our analytics"). The
 * OpenAPI schema types the path id as `integer | nanoid`, but the route accepts
 * the literal words `root` and `trash` as well — verified live:
 * `/api/collection/root/items` returned `{data, limit, offset, total, models}`
 * with the instance's top-level contents. Typing this param as a number would
 * make the most useful collection on every instance unreachable.
 *
 * ## `models` repeats, it does not comma-join
 *
 * The schema types `models` as an *array* of enum strings, and the wire form is
 * `?models=card&models=dashboard`. `lib/client.ts` appends array values rather
 * than setting one comma-joined value, which is the difference between filtering
 * on two types and filtering on a type literally named `"card,dashboard"`.
 *
 * The enum here is **not** the same as `search`'s — a collection can contain a
 * `pulse`, `snippet` or `timeline` and cannot contain a `database` or `segment`.
 * Both lists are transcribed separately in `lib/params.ts` for that reason.
 *
 * ## Pagination, verified
 *
 * `?limit=2&offset=0` against the root collection returned
 * `{"limit":2,"offset":0,"total":2,"data":[…2 items…]}` — the envelope echoes
 * both back, so a caller can page without guessing.
 */
interface Input {
  collectionId: string;
  /** A multiselect arrives as an array; a single selection may arrive as a string. */
  models?: string[] | string;
  archived?: boolean;
  pinnedState?: string;
  sortColumn?: string;
  sortDirection?: string;
  limit?: number;
  offset?: number;
}

const collectionItems: ActionDefinition<Input> = {
  key: "collection-items",
  type: "search",
  resource: "collection",
  title: "List Collection Items",
  description:
    "List the questions, dashboards, models and sub-collections inside a collection. Paginated.",
  params: [
    {
      key: "collectionId",
      label: "Collection ID",
      type: "string",
      required: true,
      default: "root",
      placeholder: "root",
      hint:
        "A numeric collection id, or the literal `root` for the top level (Our analytics), or " +
        "`trash`.",
    },
    {
      key: "models",
      label: "Types",
      type: "multiselect",
      options: collectionItemModelOptions,
      hint: "Restrict to these entity types. Leave empty for everything.",
    },
    {
      key: "archived",
      label: "Archived only",
      type: "boolean",
      default: false,
    },
    {
      key: "pinnedState",
      label: "Pinned state",
      type: "select",
      options: pinnedStateOptions,
    },
    {
      key: "sortColumn",
      label: "Sort by",
      type: "select",
      options: collectionSortOptions,
    },
    {
      key: "sortDirection",
      label: "Sort direction",
      type: "select",
      options: [
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" },
      ],
    },
    limitParam,
    offsetParam,
  ],
  output: pageOutput,

  execute(input, ctx) {
    return new MetabaseClient(ctx).request(
      `/api/collection/${encodeURIComponent(input.collectionId)}/items`,
      {
        query: {
          // Repeated, not comma-joined — see the file comment.
          models: toList(input.models),
          archived: input.archived,
          pinned_state: input.pinnedState,
          sort_column: input.sortColumn,
          sort_direction: input.sortDirection,
          limit: input.limit,
          offset: input.offset,
        },
      },
    );
  },
};

export default collectionItems;
