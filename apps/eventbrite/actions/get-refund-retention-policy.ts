import type { ActionDefinition } from "@w6w/types";
import { REFUND_RETENTION_POLICY_OUTPUT, REFUND_RETENTION_POLICY_SAMPLE } from "../lib/outputs.ts";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  orderId: string;
  refundReasonCode?: string;
  totalRefundAmount?: string;
}

const getRefundRetentionPolicy: ActionDefinition<Input> = {
  key: "get-refund-retention-policy",
  type: "read",
  resource: "order",
  title: "Get Refund Retention Policy",
  description:
    "Check whether the Eventbrite service fee is retained when refunding an order for a given reason. Call before Refund Order.",
  idempotent: true,
  params: [
    { key: "orderId", label: "Order ID", type: "string", required: true },
    {
      key: "refundReasonCode",
      label: "Refund reason code",
      type: "string",
      hint: "Same values as the Refund Order `reason`.",
    },
    {
      key: "totalRefundAmount",
      label: "Total refund amount",
      type: "string",
      hint: "e.g. `10.00`. Pass for a partial refund; partial refunds do not retain the fee.",
    },
  ],
  output: REFUND_RETENTION_POLICY_OUTPUT,
  sample: REFUND_RETENTION_POLICY_SAMPLE,

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(
      `/orders/${encodeURIComponent(input.orderId)}/get_retention_policy_information/`,
      {
        query: {
          refund_reason_code: input.refundReasonCode,
          total_refund_amount: input.totalRefundAmount,
        },
      },
    );
  },
};

export default getRefundRetentionPolicy;
