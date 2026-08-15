import type { ActionDefinition } from "@w6w/types";
import { ThriveCartClient } from "../lib/client.ts";
import { modeParam, orderIdParam } from "../lib/params.ts";

/**
 * `POST /refund` — refund a specific charge. Marked NOT idempotent: unlike
 * cancel/pause/resume, a refund moves real money, and the vendor's
 * documentation gives no guarantee a second call against an
 * already-refunded charge is rejected rather than repeated.
 */
interface Input {
  orderId: string;
  reference: string;
  mode?: string;
}

const transactionRefund: ActionDefinition<Input> = {
  key: "transaction-refund",
  type: "perform",
  resource: "transaction",
  title: "Refund Transaction",
  description: "Refund a specific charge, identified by order ID and item reference.",
  idempotent: false,
  params: [
    orderIdParam,
    {
      key: "reference",
      label: "Item reference",
      type: "string",
      required: true,
      hint: 'From a Search Transactions result (the `reference` field), e.g. "product-299".',
    },
    modeParam,
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    return new ThriveCartClient(ctx).post("/refund", {
      form: { order_id: input.orderId, reference: input.reference },
      mode: input.mode,
    });
  },
};

export default transactionRefund;
