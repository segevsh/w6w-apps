import type { ActionDefinition } from "@w6w/types";
import { BraintreeClient, compact, requestKey } from "../lib/client.ts";
import { TRANSACTION_FULL } from "../lib/selections.ts";
import { amountParam, apiRequestKeyParam, TRANSACTION_OUTPUT } from "../lib/transactions.ts";

interface Input {
  transactionId: string;
  amount?: string;
  orderId?: string;
  apiRequestKey?: string;
}

/** `captureTransaction` — submit an authorization for settlement. */
const transactionCapture: ActionDefinition<Input> = {
  key: "transaction-capture",
  type: "perform",
  resource: "transaction",
  title: "Capture Transaction",
  description:
    "Submit an authorized transaction for settlement, for its full amount or a lower one.",
  idempotent: true,
  params: [
    {
      key: "transactionId",
      label: "Transaction ID",
      type: "string",
      required: true,
      hint: "GraphQL ID of an AUTHORIZED transaction.",
    },
    {
      ...amountParam("Amount to capture", false),
      hint: "Leave empty to capture the full authorized amount. A lower amount settles that " +
        "much and releases the rest; use Partial Capture to capture in several steps.",
    },
    { key: "orderId", label: "Order ID", type: "string" },
    apiRequestKeyParam,
  ],
  output: TRANSACTION_OUTPUT,

  async execute(input, ctx) {
    const client = new BraintreeClient(ctx);
    const options = compact({ amount: input.amount, orderId: input.orderId });
    const key = requestKey(client, input.apiRequestKey);
    const payload = await client.field<{ transaction: Record<string, unknown> | null }>(
      "captureTransaction",
      `mutation Capture($input: CaptureTransactionInput!) {
        captureTransaction(input: $input) { transaction { ${TRANSACTION_FULL} } }
      }`,
      {
        input: {
          transactionId: input.transactionId,
          ...(Object.keys(options).length ? { transaction: options } : {}),
          ...(key ? { apiRequestKey: key } : {}),
        },
      },
    );
    return payload.transaction ?? {};
  },
};

export default transactionCapture;
