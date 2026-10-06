import type { ActionDefinition } from "@w6w/types";
import { encodeId, listResources, V2 } from "../lib/client.ts";
import { pageParam, pagingQuery, perPageParam, str } from "../lib/params.ts";

/**
 * `GET /api/v2/status-pages/{status_page_id}/status-reports` (Better Stack Uptime API v2).
 */
type Input = {
  status_page_id: string;
  page?: number;
  per_page?: number;
};

const statusReportList: ActionDefinition<Input> = {
  key: "status-report-list",
  type: "read",
  resource: "status-page",
  title: "List Status Reports",
  description: "Incident and maintenance reports published on a status page.",
  params: [
    str("status_page_id", "Status page ID", { required: true, hint: "The status page." }),
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
    return listResources(
      ctx,
      `${V2}/status-pages/${encodeId(input.status_page_id)}/status-reports`,
      pagingQuery(input),
    );
  },
};

export default statusReportList;
