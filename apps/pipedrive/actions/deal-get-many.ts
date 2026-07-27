import type { ActionDefinition } from "@w6w/types";
import { compact, PipedriveClient } from "../lib/client.ts";

interface Input {
  status?: string;
  filterId?: number;
  userId?: number;
  stageId?: number;
  start?: number;
  limit?: number;
  sort?: string;
}

/**
 * GET /deals — list deals, one page at a time. Pipedrive paginates with
 * `start`/`limit`; `additional_data.pagination.next_start` on the response
 * drives the next page.
 */
const dealGetMany: ActionDefinition<Input> = {
  key: "deal-get-many",
  type: "read",
  resource: "deal",
  title: "Get Many Deals",
  description: "List deals, optionally filtered by status, owner, stage or a saved filter.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "all_not_deleted", label: "All (not deleted)" },
        { value: "open", label: "Open" },
        { value: "won", label: "Won" },
        { value: "lost", label: "Lost" },
        { value: "deleted", label: "Deleted" },
      ],
    },
    { key: "filterId", label: "Filter ID", type: "number", hint: "ID of a saved filter." },
    { key: "userId", label: "Owner (user ID)", type: "number" },
    { key: "stageId", label: "Stage ID", type: "number" },
    { key: "start", label: "Start (offset)", type: "number", default: 0 },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "sort", label: "Sort", type: "string", hint: "e.g. `add_time DESC`." },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "data", type: "array", label: "Deals" },
    { key: "additional_data", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    const client = new PipedriveClient(ctx);
    return client.request("/deals", {
      query: compact({
        status: input.status,
        filter_id: input.filterId,
        user_id: input.userId,
        stage_id: input.stageId,
        start: input.start,
        limit: input.limit,
        sort: input.sort,
      }),
    });
  },
};

export default dealGetMany;
