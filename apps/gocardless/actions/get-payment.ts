import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoCardlessClient } from "../lib/client.ts";

/**
 * `GET /payments/{id}` — one payment.
 *
 * Every field a reconciliation cares about: `amount` (an integer in the
 * currency's lowest denomination), `currency`, `status`, the `charge_date`
 * GoCardless will actually debit on, `reference`, and the `links` back to the
 * mandate and subscription that produced it. `amount_refunded` is reported by
 * the vendor once refunds exist, which is what `create-refund`'s
 * `total_amount_confirmation` guard is checked against.
 */
interface Input {
  paymentId: string;
}

const getPayment: ActionDefinition<Input, Record<string, unknown>> = {
  key: "get-payment",
  type: "read",
  resource: "payment",
  title: "Get Payment",
  description:
    "Fetch one payment, including its status, charge date and linked mandate/subscription.",
  params: [
    {
      key: "paymentId",
      label: "Payment ID",
      type: "string",
      required: true,
      placeholder: "PM0000…",
      hint: "GoCardless's own payment id, as returned by `create-payment` or `list-payments`.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Payment ID" },
    { key: "amount", type: "number", label: "Amount (lowest denomination)" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "status", type: "string", label: "Status" },
    { key: "charge_date", type: "string", label: "Charge date" },
    { key: "reference", type: "string", label: "Reference" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "links", type: "object", label: "Linked resources (mandate, subscription, creditor)" },
  ],

  execute(input, ctx) {
    return new GoCardlessClient(ctx).one("payments", `/payments/${encodeId(input.paymentId)}`);
  },
};

export default getPayment;
