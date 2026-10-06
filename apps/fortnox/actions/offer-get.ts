import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient, seg } from "../lib/client.ts";

interface Input {
  documentNumber: string;
}

const offerGet: ActionDefinition<Input> = {
  key: "offer-get",
  type: "read",
  resource: "offer",
  title: "Get Offer",
  description: "Fetch one offer, with its rows, by document number.",
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
      "label": "Offer record",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).get(`/3/offers/${seg(input.documentNumber)}`);
  },
};

export default offerGet;
