import type { ActionDefinition } from "@w6w/types";
import { SharetribeClient } from "../lib/client.ts";
import { createdAtRangeParams, includeParam, listOutput, paginationParams } from "../lib/params.ts";

interface Input {
  authorId?: string;
  ids?: string;
  states?: string;
  createdAtStart?: string;
  createdAtEnd?: string;
  keywords?: string;
  price?: string;
  sort?: string;
  include?: string;
  page?: number;
  perPage?: number;
}

/**
 * `GET /v1/integration_api/listings/query` — search marketplace listings.
 *
 * Returns listings in **every** state by default — unlike the public Marketplace API's own
 * `/listings/query`, this endpoint is not implicitly filtered to `published`. Use `states` to
 * narrow it down.
 *
 * Geolocation/availability search (`origin`, `bounds`, `start`, `end`, `seats`, `availability`,
 * `minDuration`, `stockMode`, `minStock`) and extended-data filters (`pub_*`/`meta_*`) are not
 * exposed here — they interact with pagination in vendor-documented, non-obvious ways (several
 * combinations disable paging entirely) and depend on each marketplace's own configured search
 * schema. Use the plain filters here for a general query.
 */
const listingList: ActionDefinition<Input> = {
  key: "listing-list",
  type: "search",
  resource: "listing",
  title: "List Listings",
  description: "Query marketplace listings in any state, optionally filtered by author, IDs, " +
    "state, creation time or keywords.",
  params: [
    { key: "authorId", label: "Author (user) ID", type: "string" },
    {
      key: "ids",
      label: "Listing IDs",
      type: "string",
      hint: "Comma-separated UUIDs. Max 100.",
    },
    {
      key: "states",
      label: "States",
      type: "string",
      hint: 'Comma-separated listing states to match, e.g. "published,closed". Leave empty for ' +
        "every state.",
    },
    ...createdAtRangeParams(),
    {
      key: "keywords",
      label: "Keywords",
      type: "string",
      hint: "Matches against title, description and text-typed extended-data fields, and sorts " +
        "by relevance. Cannot be combined with an origin/bounds search.",
    },
    {
      key: "price",
      label: "Price range",
      type: "string",
      hint: 'Amounts in the currency\'s minor unit. "1400,1600" (between), "1400," (at least), ' +
        '",1600" (at most), or a bare value for exact match.',
    },
    {
      key: "sort",
      label: "Sort",
      type: "string",
      placeholder: "createdAt",
      hint: 'Comma-separated, up to 3 attributes ("createdAt", "price", or a pub_*/meta_* long ' +
        'field). Prefix with "-" to reverse.',
    },
    includeParam,
    ...paginationParams(),
  ],
  output: listOutput,

  execute(input, ctx) {
    return new SharetribeClient(ctx).query("/listings/query", {
      authorId: input.authorId,
      ids: input.ids,
      states: input.states,
      createdAtStart: input.createdAtStart,
      createdAtEnd: input.createdAtEnd,
      keywords: input.keywords,
      price: input.price,
      sort: input.sort,
      include: input.include,
      page: input.page,
      perPage: input.perPage,
    });
  },
};

export default listingList;
