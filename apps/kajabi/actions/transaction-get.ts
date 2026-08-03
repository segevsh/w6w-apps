import type { ActionDefinition } from "@w6w/types";
import { KajabiClient, unset } from "../lib/client.ts";
import { fieldsParam, idParam, resourceOutput } from "../lib/params.ts";

/** `GET /v1/transactions/{id}` — one payment. */
interface Input {
  id: string;
  fields?: string;
}

const transactionGet: ActionDefinition<Input> = {
  key: "transaction-get",
  type: "read",
  resource: "transaction",
  title: "Get Transaction",
  description: "Fetch one transaction by id.",
  params: [
    idParam("Transaction ID", "`transaction-list` returns the ids."),
    fieldsParam("transactions", "amount,created_at"),
  ],
  output: resourceOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request(`/transactions/${encodeURIComponent(input.id)}`, {
      query: { "fields[transactions]": unset(input.fields) },
    });
  },
};

export default transactionGet;
