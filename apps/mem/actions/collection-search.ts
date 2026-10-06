import type { ActionDefinition } from "@w6w/types";
import { call, pick, plainList } from "../lib/client.ts";
import { dateFilterParams, str } from "../lib/params.ts";

/** `POST /v2/collections/search` (Mem API v2). */
type Input = Record<string, unknown>;

const collectionSearch: ActionDefinition<Input> = {
  key: "collection-search",
  type: "search",
  resource: "collection",
  title: "Search Collections",
  description: "Search collections by text query and date filters. Not paged.",
  params: [
    str("query", "Query"),
    ...dateFilterParams,
  ],
  output: [
    { key: "items", type: "array", label: "Matching collections" },
    { key: "total", type: "number", label: "Total matches" },
  ],

  execute(input, ctx) {
    return call(ctx, "POST", `/v2/collections/search`, {
      body: pick(input, [
        "query",
        "filter_by_created_after",
        "filter_by_created_before",
        "filter_by_updated_after",
        "filter_by_updated_before",
      ]),
    }).then(plainList);
  },
};

export default collectionSearch;
