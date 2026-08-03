import type { ActionDefinition } from "@w6w/types";
import { SquareClient } from "../lib/client.ts";

interface Input {
  paymentId: string;
}

/** `GET /v2/payments/{payment_id}` (GetPayment). */
const paymentGet: ActionDefinition<Input> = {
  key: "payment-get",
  type: "read",
  resource: "payment",
  title: "Get Payment",
  description: "Retrieve one payment — its status, amounts, card details and linked order.",
  params: [
    {
      key: "paymentId",
      label: "Payment ID",
      type: "string",
      required: true,
      placeholder: "bP9mAsQPXNbXqOMbyOAluCtVYugZY",
    },
  ],
  output: [
    { key: "payment", type: "object", label: "Payment" },
    { key: "errors", type: "array", label: "Errors reported alongside a 2xx" },
  ],

  execute(input, ctx) {
    return new SquareClient(ctx).request(`/payments/${encodeURIComponent(input.paymentId)}`);
  },
};

export default paymentGet;
