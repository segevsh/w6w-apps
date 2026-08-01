import type { ActionDefinition } from "@w6w/types";
import { PayPalClient } from "../lib/client.ts";

/**
 * Show batch payout details, including item statuses. Wraps
 * `GET /v1/payments/payouts/{id}`.
 */
const action: ActionDefinition = {
  key: "payout-get",
  type: "read",
  resource: "payout",
  title: "Get a payout",
  description: "Show the latest status of a batch payout, and its items.",
  params: [
    { key: "payoutBatchId", label: "Payout Batch ID", type: "string", required: true, default: "" },
    { key: "pageSize", label: "Page Size", type: "number", default: 100 },
  ],
  output: [
    {
      key: "batch_header",
      type: "object",
      label: "Batch header ({ payout_batch_id, batch_status, … })",
    },
    { key: "items", type: "array", label: "Payout items and their statuses" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const payoutBatchId = String(p.payoutBatchId ?? "").trim();
    if (!payoutBatchId) throw new Error("`payoutBatchId` is required");
    return await new PayPalClient(ctx).request(`/v1/payments/payouts/${payoutBatchId}`, {
      query: { page_size: Number(p.pageSize ?? 100) },
    });
  },
};

export default action;
