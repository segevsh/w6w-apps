import type { ActionDefinition } from "@w6w/types";
import { BraintreeClient, requestKey } from "../lib/client.ts";
import { MONEY } from "../lib/selections.ts";
import { apiRequestKeyParam } from "../lib/transactions.ts";

interface Input {
  transactionId: string;
  apiRequestKey?: string;
}

/**
 * `reverseTransaction` — `reversal` is a `Transaction | Refund` union: a void when the original
 * had not settled, a full refund when it had. `__typename` says which.
 */
const transactionReverse: ActionDefinition<Input> = {
  key: "transaction-reverse",
  type: "perform",
  resource: "transaction",
  title: "Reverse Transaction",
  description:
    "Undo a transaction in full whatever its settlement state: voids it if unsettled, refunds the full amount if settled.",
  idempotent: true,
  params: [
    {
      key: "transactionId",
      label: "Transaction ID",
      type: "string",
      required: true,
      hint: "GraphQL ID. Use Refund Transaction instead for a partial refund.",
    },
    apiRequestKeyParam,
  ],
  output: [
    {
      key: "kind",
      type: "string",
      label: "`void` (Transaction returned) or `refund` (Refund returned)",
    },
    { key: "id", type: "string", label: "GraphQL ID of the voided transaction or the new refund" },
    { key: "legacyId", type: "string", label: "Legacy ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "amount", type: "object", label: "Amount ({ value, currencyCode })" },
  ],

  async execute(input, ctx) {
    const client = new BraintreeClient(ctx);
    const key = requestKey(client, input.apiRequestKey);
    const payload = await client.field<{ reversal: Record<string, unknown> | null }>(
      "reverseTransaction",
      `mutation Reverse($input: ReverseTransactionInput!) {
        reverseTransaction(input: $input) {
          reversal {
            __typename
            ... on Transaction { id legacyId status amount ${MONEY} }
            ... on Refund { id legacyId status amount ${MONEY} }
          }
        }
      }`,
      { input: { transactionId: input.transactionId, ...(key ? { apiRequestKey: key } : {}) } },
    );
    const { __typename, ...rest } = payload.reversal ?? {};
    return { kind: __typename === "Refund" ? "refund" : "void", ...rest };
  },
};

export default transactionReverse;
