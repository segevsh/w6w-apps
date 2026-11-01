import type { ActionDefinition } from "@w6w/types";
import { DISCOUNT_OUTPUT, DISCOUNT_SAMPLE } from "../lib/outputs.ts";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  discountId: string;
}

const action: ActionDefinition<Input> = {
  key: "get-discount",
  type: "read",
  resource: "discount",
  title: "Get Discount",
  description: "Retrieve a Discount by ID.",
  params: [
    {
      "key": "discountId",
      "label": "Discount ID",
      "type": "string",
      "required": true,
    },
  ],
  output: DISCOUNT_OUTPUT,
  sample: DISCOUNT_SAMPLE,
  idempotent: true,

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/discounts/${encodeURIComponent(input.discountId)}/`);
  },
};

export default action;
