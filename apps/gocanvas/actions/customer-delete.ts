import type { ActionDefinition } from "@w6w/types";
import { deleted, encodeId, GoCanvasClient, hardDeleteQuery } from "../lib/client.ts";
import { hardDeleteParam, idParam } from "../lib/params.ts";

interface Input {
  customerId: number;
  hardDelete?: boolean;
}

const customerDelete: ActionDefinition<Input> = {
  key: "customer-delete",
  type: "perform",
  resource: "customer",
  title: "Delete Customer",
  description:
    "Soft-delete a customer (hidden from the web views, data kept), or permanently delete it with Delete permanently.",
  idempotent: true,
  params: [
    idParam("customerId", "Customer ID"),
    hardDeleteParam,
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "The API's confirmation, or { deleted: true } when it returns no body",
    },
  ],

  async execute(input, ctx) {
    return deleted(
      await new GoCanvasClient(ctx).request(`/customers/${encodeId(input.customerId)}`, {
        method: "DELETE",
        query: hardDeleteQuery(input.hardDelete),
      }),
    );
  },
};

export default customerDelete;
