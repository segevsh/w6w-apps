import type { ActionDefinition } from "@w6w/types";
import { BraintreeClient, compact, requestKey } from "../lib/client.ts";
import { REFUND_FIELDS } from "../lib/selections.ts";
import { amountParam, apiRequestKeyParam, orderIdParam } from "../lib/transactions.ts";

interface Input {
  transactionId: string;
  amount?: string;
  orderId?: string;
  description?: string;
  apiRequestKey?: string;
}

/** `refundTransaction` — return money on a settled transaction. */
const transactionRefund: ActionDefinition<Input> = {
  key: "transaction-refund",
  type: "perform",
  resource: "refund",
  title: "Refund Transaction",
  description:
    "Refund a settled transaction in full or in part. The refund is a new object linked to the original.",
  idempotent: true,
  params: [
    {
      key: "transactionId",
      label: "Transaction ID",
      type: "string",
      required: true,
      hint: "GraphQL ID of a SETTLED transaction. An unsettled one must be voided instead.",
    },
    {
      ...amountParam("Refund amount", false),
      hint: "Leave empty to refund the full amount. A decimal string such as `4.50`.",
    },
    orderIdParam,
    { key: "description", label: "Description", type: "string" },
    apiRequestKeyParam,
  ],
  output: [
    { key: "id", type: "string", label: "Refund GraphQL ID" },
    { key: "legacyId", type: "string", label: "Legacy ID" },
    { key: "status", type: "string", label: "Refund status" },
    { key: "amount", type: "object", label: "Amount ({ value, currencyCode })" },
    { key: "orderId", type: "string", label: "Order ID" },
    { key: "refundedTransaction", type: "object", label: "Original transaction" },
  ],

  async execute(input, ctx) {
    const client = new BraintreeClient(ctx);
    const refund = compact({
      amount: input.amount,
      orderId: input.orderId,
      description: input.description,
    });
    const key = requestKey(client, input.apiRequestKey);
    const payload = await client.field<{ refund: Record<string, unknown> | null }>(
      "refundTransaction",
      `mutation Refund($input: RefundTransactionInput!) {
        refundTransaction(input: $input) { refund { ${REFUND_FIELDS} } }
      }`,
      {
        input: {
          transactionId: input.transactionId,
          ...(Object.keys(refund).length ? { refund } : {}),
          ...(key ? { apiRequestKey: key } : {}),
        },
      },
    );
    return payload.refund ?? {};
  },
};

export default transactionRefund;
