import type { ActionDefinition } from "@w6w/types";
import { SquareClient } from "../lib/client.ts";

interface Input {
  refundId: string;
}

/** `GET /v2/refunds/{refund_id}` (GetPaymentRefund). */
const refundGet: ActionDefinition<Input> = {
  key: "refund-get",
  type: "read",
  resource: "refund",
  title: "Get Refund",
  description: "Retrieve one payment refund — its status, amount, reason and originating payment.",
  params: [
    { key: "refundId", label: "Refund ID", type: "string", required: true },
  ],
  output: [
    { key: "refund", type: "object", label: "Refund" },
    { key: "errors", type: "array", label: "Errors reported alongside a 2xx" },
  ],

  execute(input, ctx) {
    return new SquareClient(ctx).request(`/refunds/${encodeURIComponent(input.refundId)}`);
  },
};

export default refundGet;
