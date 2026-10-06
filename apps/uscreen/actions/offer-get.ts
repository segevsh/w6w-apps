import type { ActionDefinition } from "@w6w/types";
import { seg, UscreenClient } from "../lib/client.ts";

interface Input {
  offerId: string;
}

const offerGet: ActionDefinition<Input> = {
  key: "offer-get",
  type: "read",
  resource: "offer",
  title: "Get Offer",
  description: "Fetch one offer by id.",
  params: [
    { "key": "offerId", "label": "Offer ID", "type": "string", "required": true },
  ],
  output: [
    { key: "id", type: "number", label: "Record id (the full vendor object is returned)" },
  ],

  async execute(input, ctx) {
    return (await new UscreenClient(ctx).call<Record<string, unknown>>(
      "GET",
      `/offers/${seg(input.offerId)}`,
      {},
    )) ?? {};
  },
};

export default offerGet;
