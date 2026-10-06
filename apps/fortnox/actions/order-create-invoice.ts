import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient, seg } from "../lib/client.ts";

interface Input {
  documentNumber: string;
}

const orderCreateInvoice: ActionDefinition<Input> = {
  key: "order-create-invoice",
  type: "perform",
  resource: "order",
  title: "Create Invoice From Order",
  description: "Turn an order into a customer invoice.",
  idempotent: false,
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
      "label": "Create Invoice From Order result",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).put(`/3/orders/${seg(input.documentNumber)}/createinvoice`);
  },
};

export default orderCreateInvoice;
