import type { ActionDefinition } from "@w6w/types";
import { call, pageList, pickQuery } from "../lib/client.ts";
import { dateFilterParams, limitParam, orderBy, pageParam } from "../lib/params.ts";

/** `GET /v2/collections` (Mem API v2). */
type Input = Record<string, unknown>;

const collectionList: ActionDefinition<Input> = {
  key: "collection-list",
  type: "read",
  resource: "collection",
  title: "List Collections",
  description: "List collections with cursor pagination and optional date filters.",
  params: [
    pageParam,
    limitParam,
    orderBy,
    ...dateFilterParams,
  ],
  output: [
    { key: "items", type: "array", label: "Results of this page" },
    { key: "total", type: "number", label: "Total matching" },
    { key: "nextPage", type: "string", label: "Cursor for the next page, or null" },
    { key: "hasMore", type: "boolean", label: "Whether a further page exists" },
  ],

  execute(input, ctx) {
    return call(ctx, "GET", `/v2/collections`, {
      query: pickQuery(input, [
        "page",
        "limit",
        "order_by",
        "filter_by_created_after",
        "filter_by_created_before",
        "filter_by_updated_after",
        "filter_by_updated_before",
      ]),
    }).then(pageList);
  },
};

export default collectionList;
