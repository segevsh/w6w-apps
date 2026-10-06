import type { ActionDefinition } from "@w6w/types";
import { DubClient, seg } from "../lib/client.ts";

interface Input {
  customerId: string;
}

/** `DELETE /customers/{id}`. */
const customerDelete: ActionDefinition<Input> = {
  key: "customer-delete",
  type: "perform",
  resource: "customer",
  title: "Delete Customer",
  description: "Delete a customer from the workspace.",
  idempotent: true,
  params: [
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      required: true,
      hint: "The Dub customer ID, or `ext_` followed by your external ID.",
    },
  ],
  output: [{ key: "id", type: "string", label: "ID of the deleted customer" }],

  execute(input, ctx) {
    return new DubClient(ctx).request("DELETE", `/customers/${seg(input.customerId)}`);
  },
};

export default customerDelete;
