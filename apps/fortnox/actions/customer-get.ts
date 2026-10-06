import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient, seg } from "../lib/client.ts";

interface Input {
  customerNumber: string;
}

const customerGet: ActionDefinition<Input> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Fetch one customer by customer number.",
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
      "key": "Customer",
      "type": "object",
      "label": "Customer record",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).get(`/3/customers/${seg(input.customerNumber)}`);
  },
};

export default customerGet;
