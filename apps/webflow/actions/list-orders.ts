import type { ActionDefinition } from "@w6w/types";
import { WebflowClient } from "../lib/client.ts";

interface Input {
  siteId: string;
  status?: string;
  limit?: number;
  offset?: number;
}

/**
 * GET /sites/{site_id}/orders — list an e-commerce site's orders, optionally
 * filtered by `status` (e.g. `pending`, `unfulfilled`, `fulfilled`, `disputed`,
 * `refunded`). The response is `{ orders: [...], pagination: {...} }`.
 */
const listOrders: ActionDefinition<Input> = {
  key: "list-orders",
  type: "read",
  resource: "order",
  title: "List Orders",
  description: "List orders for an e-commerce site, optionally filtered by status.",
  params: [
    { key: "siteId", label: "Site ID", type: "string", required: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "pending", label: "Pending" },
        { value: "unfulfilled", label: "Unfulfilled" },
        { value: "fulfilled", label: "Fulfilled" },
        { value: "disputed", label: "Disputed" },
        { value: "dispute-lost", label: "Dispute lost" },
        { value: "refunded", label: "Refunded" },
      ],
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      hint: "Max 100.",
      validation: { min: 1, max: 100 },
    },
    { key: "offset", label: "Offset", type: "number", hint: "For pagination." },
  ],
  output: [
    { key: "orders", type: "array", label: "Orders" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    const client = new WebflowClient(ctx);
    return client.request(`/sites/${encodeURIComponent(input.siteId)}/orders`, {
      query: { status: input.status, limit: input.limit, offset: input.offset },
    });
  },
};

export default listOrders;
