import type { ActionDefinition } from "@w6w/types";
import { SallaClient, seg } from "../lib/client.ts";

interface Input {
  customer_id: number;
}

const customerDelete: ActionDefinition<Input> = {
  key: "customer-delete",
  type: "perform",
  resource: "customer",
  title: "Delete Customer",
  description: "Delete a customer by ID. Needs the `customers.read_write` scope.",
  idempotent: true,
  params: [
    {
      "key": "customer_id",
      "label": "Customer ID",
      "type": "number",
      "required": true,
    },
  ],
  output: [
    {
      "key": "deleted",
      "type": "boolean",
      "label": "True when Salla accepted the delete",
    },
  ],

  execute(input, ctx) {
    const client = new SallaClient(ctx);
    return client.delete(`/customers/${seg(input.customer_id)}`);
  },
};

export default customerDelete;
