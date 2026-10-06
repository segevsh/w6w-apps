import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient, seg } from "../lib/client.ts";

interface Input {
  documentNumber: string;
}

const orderGet: ActionDefinition<Input> = {
  key: "order-get",
  type: "read",
  resource: "order",
  title: "Get Order",
  description: "Fetch one order, with its rows, by document number.",
  params: [
    {
      "key": "documentNumber",
      "label": "Order document number",
      "type": "string",
      "required": true,
    },
  ],
  output: [
    {
      "key": "Order",
      "type": "object",
      "label": "Order record",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).get(`/3/orders/${seg(input.documentNumber)}`);
  },
};

export default orderGet;
