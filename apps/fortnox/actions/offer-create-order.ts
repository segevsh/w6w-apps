import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient, seg } from "../lib/client.ts";

interface Input {
  documentNumber: string;
}

const offerCreateOrder: ActionDefinition<Input> = {
  key: "offer-create-order",
  type: "perform",
  resource: "offer",
  title: "Create Order From Offer",
  description: "Turn an offer into an order.",
  idempotent: false,
  params: [
    {
      "key": "documentNumber",
      "label": "Offer document number",
      "type": "string",
      "required": true,
    },
  ],
  output: [
    {
      "key": "Offer",
      "type": "object",
      "label": "Create Order From Offer result",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).put(`/3/offers/${seg(input.documentNumber)}/createorder`);
  },
};

export default offerCreateOrder;
