import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient, seg } from "../lib/client.ts";

interface Input {
  customerNumber: string;
}

const customerDelete: ActionDefinition<Input> = {
  key: "customer-delete",
  type: "perform",
  resource: "customer",
  title: "Delete Customer",
  description: "Delete a customer. Fortnox reserves the number even after deletion.",
  idempotent: true,
  params: [
    {
      "key": "customerNumber",
      "label": "Customer number",
      "type": "string",
      "required": true,
    },
  ],
  output: [
    {
      "key": "deleted",
      "type": "boolean",
      "label": "True when Fortnox answered 204",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).delete(`/3/customers/${seg(input.customerNumber)}`);
  },
};

export default customerDelete;
