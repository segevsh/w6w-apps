import type { ActionDefinition } from "@w6w/types";
import { TremendousClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /orders` — list orders, newest first.
 *
 * The only filters `list-orders` documents are `campaign_id`, `external_id`
 * and a `created_at[gte]`/`created_at[lte]` range (ISO 8601 datetimes) —
 * there is no status filter.
 */
interface Input {
  campaignId?: string;
  externalId?: string;
  createdAtGte?: string;
  createdAtLte?: string;
  offset?: number;
  limit?: number;
}

const orderList: ActionDefinition<Input> = {
  key: "order-list",
  type: "search",
  resource: "order",
  title: "List Orders",
  description: "List orders, newest first, optionally filtered by campaign, external ID or date.",
  params: [
    { key: "campaignId", label: "Campaign ID", type: "string" },
    { key: "externalId", label: "External ID", type: "string" },
    {
      key: "createdAtGte",
      label: "Created at or after",
      type: "datetime",
      advanced: true,
      hint: "ISO 8601, e.g. 2026-07-15T18:12:18Z.",
    },
    {
      key: "createdAtLte",
      label: "Created at or before",
      type: "datetime",
      advanced: true,
      hint: "ISO 8601, e.g. 2026-08-01T18:12:18Z.",
    },
    // Documented default 10, maximum 500.
    ...paginationParams(10, 500),
  ],
  output: [
    { key: "orders", type: "array", label: "Orders" },
    { key: "total_count", type: "number", label: "Total matching orders" },
  ],

  execute(input, ctx) {
    return new TremendousClient(ctx).json("/orders", {
      query: {
        campaign_id: input.campaignId,
        external_id: input.externalId,
        "created_at[gte]": input.createdAtGte,
        "created_at[lte]": input.createdAtLte,
        offset: input.offset,
        limit: input.limit,
      },
    });
  },
};

export default orderList;
