import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoCardlessClient } from "../lib/client.ts";

/**
 * `POST /payments/{id}/actions/cancel` — cancel a payment.
 *
 * Only ever stops a collection that has not been taken yet: GoCardless refuses
 * to cancel a payment that is already `confirmed` or later, and a payment that
 * has already left the customer's account must be refunded instead
 * (`create-refund`).
 *
 * Declared `idempotent: false` because the vendor treats a repeat as an error
 * (`invalid_state`) rather than as a no-op, so the runtime must not replay it.
 * No `Idempotency-Key` is sent: this endpoint creates nothing.
 */
interface Input {
  paymentId: string;
}

const cancelPayment: ActionDefinition<Input, Record<string, unknown>> = {
  key: "cancel-payment",
  type: "perform",
  resource: "payment",
  title: "Cancel Payment",
  description:
    "Cancel a payment that has not been collected yet. A payment already taken from the " +
    "customer's account can only be refunded, not cancelled.",
  idempotent: false,
  params: [
    {
      key: "paymentId",
      label: "Payment ID",
      type: "string",
      required: true,
      placeholder: "PM0000…",
      hint: "The payment to cancel. GoCardless refuses a payment that is already confirmed or " +
        "paid out, with `invalid_state`.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Payment ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "amount", type: "number", label: "Amount (lowest denomination)" },
    { key: "currency", type: "string", label: "Currency" },
  ],

  execute(input, ctx) {
    return new GoCardlessClient(ctx).action(
      "payments",
      `/payments/${encodeId(input.paymentId)}/actions/cancel`,
    );
  },
};

export default cancelPayment;
