import type { ActionDefinition } from "@w6w/types";
import { pathId, RecurlyClient } from "../lib/client.ts";

interface Input {
  transactionId: string;
}

/**
 * `GET /transactions/{transaction_id}` — fetch a single transaction.
 *
 * `transactionId` accepts Recurly's own ID with no prefix, or the
 * transaction's UUID prefixed `uuid-` — see `lib/client.ts` module doc §3.
 */
const getTransaction: ActionDefinition<Input> = {
  key: "get-transaction",
  type: "read",
  resource: "transaction",
  title: "Get Transaction",
  description: "Fetch a single transaction by Recurly ID or by UUID (prefixed `uuid-`).",
  params: [
    {
      key: "transactionId",
      label: "Transaction ID",
      type: "string",
      required: true,
      hint: "Recurly ID (`e28zov4fw0v2`) or UUID prefixed `uuid-` (`uuid-123457890`).",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Transaction ID" },
    {
      key: "type",
      type: "string",
      label: "authorization / capture / payment / purchase / refund / verify",
    },
    { key: "currency", type: "string", label: "Currency (ISO 4217)" },
    { key: "amount", type: "number", label: "Amount, in the currency's major unit" },
    { key: "status", type: "string", label: "Gateway status" },
    { key: "success", type: "boolean", label: "Whether the transaction succeeded" },
  ],

  execute(input, ctx) {
    return RecurlyClient.fromConnection(ctx).request(
      `/transactions/${pathId(input.transactionId)}`,
    );
  },
};

export default getTransaction;
