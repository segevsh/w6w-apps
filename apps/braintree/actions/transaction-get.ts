import type { ActionDefinition } from "@w6w/types";
import { BraintreeClient } from "../lib/client.ts";
import { TRANSACTION_FULL } from "../lib/selections.ts";
import { TRANSACTION_OUTPUT } from "../lib/transactions.ts";

interface Input {
  transactionId: string;
}

/** `node(id)` narrowed to `Transaction`. */
const transactionGet: ActionDefinition<Input> = {
  key: "transaction-get",
  type: "read",
  resource: "transaction",
  title: "Get Transaction",
  description:
    "Fetch one transaction by GraphQL ID with its processor response, status history and refunds.",
  params: [
    {
      key: "transactionId",
      label: "Transaction ID",
      type: "string",
      required: true,
      hint: "The GraphQL ID. A legacy id (the one in the Control Panel) must be converted first " +
        "with the Convert Legacy IDs action.",
    },
  ],
  output: [
    ...TRANSACTION_OUTPUT,
    { key: "statusHistory", type: "array", label: "Status history" },
    { key: "refunds", type: "array", label: "Refunds" },
    { key: "processorAuthorizationResponse", type: "object", label: "Processor response" },
  ],

  async execute(input, ctx) {
    const data = await new BraintreeClient(ctx).execute<{ node?: Record<string, unknown> | null }>(
      `query GetTransaction($id: ID!) { node(id: $id) { ... on Transaction { ${TRANSACTION_FULL} } } }`,
      { id: input.transactionId },
    );
    const node = data.node;
    if (!node || !node.id) {
      throw new Error(`Braintree: no transaction found for id ${input.transactionId}`);
    }
    return node;
  },
};

export default transactionGet;
