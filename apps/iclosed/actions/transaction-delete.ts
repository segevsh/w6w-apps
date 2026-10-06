import type { ActionDefinition } from "@w6w/types";
import { IClosedClient } from "../lib/client.ts";

/**
 * `DELETE /v1/transactions` — Delete a transaction.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  id: number;
}

const transactionDelete: ActionDefinition<Input> = {
  key: "transaction-delete",
  type: "perform",
  resource: "transaction",
  title: "Delete transaction",
  description: "Delete a transaction.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Transaction ID",
      type: "number",
      validation: { integer: true },
      required: true,
    },
  ],
  output: [
    { key: "message", type: "string", label: "Result message" },
    { key: "status", type: "number", label: "Status" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/transactions", {
      method: "DELETE",
      query: { id: input.id },
    });
  },
};

export default transactionDelete;
