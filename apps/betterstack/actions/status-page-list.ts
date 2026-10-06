import type { ActionDefinition } from "@w6w/types";
import { listResources, V2 } from "../lib/client.ts";
import { pageParam, pagingQuery, perPageParam } from "../lib/params.ts";

/**
 * `GET /api/v2/status-pages` (Better Stack Uptime API v2).
 */
type Input = {
  page?: number;
  per_page?: number;
};

const statusPageList: ActionDefinition<Input> = {
  key: "status-page-list",
  type: "read",
  resource: "status-page",
  title: "List Status Pages",
  description: "List the team's status pages.",
  params: [
    pageParam,
    perPageParam,
  ],
  output: [
    { key: "items", type: "array", label: "Resources on this page" },
    { key: "count", type: "number", label: "Number of items on this page" },
    { key: "hasMore", type: "boolean", label: "Another page exists" },
    {
      key: "nextPage",
      type: "number",
      label: "Page number to request next (null on the last page)",
    },
  ],

  execute(input, ctx) {
    return listResources(ctx, `${V2}/status-pages`, { ...pagingQuery(input) });
  },
};

export default statusPageList;
