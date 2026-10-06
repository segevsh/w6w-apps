import type { ActionDefinition } from "@w6w/types";
import { listQuery, ProductiveClient } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/**
 * List budget services, filtered, sorted and paged (`GET /services`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  query?: string;
  dealId?: number;
  projectId?: number;
  billable?: boolean;
  filter?: unknown;
  sort?: string;
  include?: string;
  pageSize?: number;
  pageNumber?: number;
  cursorPaging?: boolean;
  cursor?: string;
}

const serviceList: ActionDefinition<Input> = {
  key: "service-list",
  type: "search",
  resource: "service",
  title: "List Services",
  description: "List budget services, filtered, sorted and paged (`GET /services`).",
  params: [
    { "key": "query", "label": "Search text", "type": "string" },
    { "key": "dealId", "label": "Deal / budget ID", "type": "number" },
    { "key": "projectId", "label": "Project ID", "type": "number" },
    { "key": "billable", "label": "Billable", "type": "boolean" },
    ...listParams("`name`, `-name`, `project_name`, `company`, `budget`."),
  ],
  output: listOutput,

  async execute(input, ctx) {
    const items = await new ProductiveClient(ctx).many("/services", {
      query: listQuery(input, {
        "query": input.query,
        "deal_id": input.dealId,
        "project_id": input.projectId,
        "billable": input.billable,
      }),
    });
    return items;
  },
};

export default serviceList;
