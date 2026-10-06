import type { ActionDefinition } from "@w6w/types";
import { BraintreeClient, compact, requestKey } from "../lib/client.ts";
import { TRANSACTION_FULL } from "../lib/selections.ts";
import { amountParam, apiRequestKeyParam, TRANSACTION_OUTPUT } from "../lib/transactions.ts";

interface Input {
  transactionId: string;
  amount: string;
  finalCapture?: boolean;
  orderId?: string;
  apiRequestKey?: string;
}

/** `partialCaptureTransaction` — settle part of an authorization as a new child capture. */
const transactionPartialCapture: ActionDefinition<Input> = {
  key: "transaction-partial-capture",
  type: "perform",
  resource: "transaction",
  title: "Partially Capture Transaction",
  description:
    "Capture part of an authorization as a new child capture transaction; repeat until the final capture.",
  idempotent: true,
  params: [
    {
      key: "transactionId",
      label: "Authorized transaction ID",
      type: "string",
      required: true,
      hint: "GraphQL ID of the original authorized transaction (not an earlier capture).",
    },
    amountParam("Amount to capture"),
    {
      key: "finalCapture",
      label: "Final capture",
      type: "boolean",
      hint: "Mark this as the last capture so the remaining authorization is released.",
    },
    { key: "orderId", label: "Order ID", type: "string" },
    apiRequestKeyParam,
  ],
  output: TRANSACTION_OUTPUT,

  async execute(input, ctx) {
    const client = new BraintreeClient(ctx);
    const key = requestKey(client, input.apiRequestKey);
    const payload = await client.field<{ capture: Record<string, unknown> | null }>(
      "partialCaptureTransaction",
      `mutation PartialCapture($input: PartialCaptureTransactionInput!) {
        partialCaptureTransaction(input: $input) { capture { ${TRANSACTION_FULL} } }
      }`,
      {
        input: {
          transactionId: input.transactionId,
          transaction: compact({
            amount: String(input.amount),
            finalCapture: input.finalCapture,
            orderId: input.orderId,
          }),
          ...(key ? { apiRequestKey: key } : {}),
        },
      },
    );
    return payload.capture ?? {};
  },
};

export default transactionPartialCapture;
