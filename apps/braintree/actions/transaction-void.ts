import type { ActionDefinition } from "@w6w/types";
import { BraintreeClient, requestKey } from "../lib/client.ts";
import { TRANSACTION_FULL } from "../lib/selections.ts";
import { apiRequestKeyParam, TRANSACTION_OUTPUT } from "../lib/transactions.ts";

interface Input {
  transactionId: string;
  apiRequestKey?: string;
}

/** `voidTransaction` — cancel before settlement. */
const transactionVoid: ActionDefinition<Input> = {
  key: "transaction-void",
  type: "perform",
  resource: "transaction",
  title: "Void Transaction",
  description:
    "Cancel an authorized or settling transaction before it settles. Fails once it has settled; use Reverse or Refund then.",
  idempotent: true,
  params: [
    {
      key: "transactionId",
      label: "Transaction ID",
      type: "string",
      required: true,
      hint: "GraphQL ID of the transaction to void.",
    },
    apiRequestKeyParam,
  ],
  output: TRANSACTION_OUTPUT,

  async execute(input, ctx) {
    const client = new BraintreeClient(ctx);
    const key = requestKey(client, input.apiRequestKey);
    const payload = await client.field<{ transaction: Record<string, unknown> | null }>(
      "voidTransaction",
      `mutation Void($input: VoidTransactionInput!) {
        voidTransaction(input: $input) { transaction { ${TRANSACTION_FULL} } }
      }`,
      { input: { transactionId: input.transactionId, ...(key ? { apiRequestKey: key } : {}) } },
    );
    return payload.transaction ?? {};
  },
};

export default transactionVoid;
