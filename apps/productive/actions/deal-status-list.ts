import type { ActionDefinition } from "@w6w/types";
import { listQuery, ProductiveClient } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/**
 * List deal pipeline stages (`GET /deal_statuses`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  query?: string;
  pipelineId?: number;
  statusId?: number;
  filter?: unknown;
  sort?: string;
  include?: string;
  pageSize?: number;
  pageNumber?: number;
  cursorPaging?: boolean;
  cursor?: string;
}

const dealStatusList: ActionDefinition<Input> = {
  key: "deal-status-list",
  type: "search",
  resource: "deal_status",
  title: "List Deal Statuses",
  description: "List deal pipeline stages (`GET /deal_statuses`).",
  params: [
    { "key": "query", "label": "Search text", "type": "string" },
    { "key": "pipelineId", "label": "Pipeline ID", "type": "number" },
    {
      "key": "statusId",
      "label": "Outcome",
      "type": "number",
      "hint": "1, 2, 3 or 4 (open, won, lost, delivered, per the vendor).",
    },
    ...listParams("`name`, `position`, `-created_at`, `pipeline_id`."),
  ],
  output: listOutput,

  async execute(input, ctx) {
    const items = await new ProductiveClient(ctx).many("/deal_statuses", {
      query: listQuery(input, {
        "query": input.query,
        "pipeline_id": input.pipelineId,
        "status_id": input.statusId,
      }),
    });
    return items;
  },
};

export default dealStatusList;
