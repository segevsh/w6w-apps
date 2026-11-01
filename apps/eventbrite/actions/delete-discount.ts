import type { ActionDefinition } from "@w6w/types";
import { DELETED_OUTPUT, DELETED_SAMPLE } from "../lib/outputs.ts";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  discountId: string;
}

const action: ActionDefinition<Input> = {
  key: "delete-discount",
  type: "perform",
  resource: "discount",
  title: "Delete Discount",
  description:
    "Permanently delete an unused Discount on Eventbrite. A deleted Discount cannot be restored; used Discounts cannot be deleted.",
  params: [
    {
      "key": "discountId",
      "label": "Discount ID",
      "type": "string",
      "required": true,
    },
  ],
  output: DELETED_OUTPUT,
  sample: DELETED_SAMPLE,
  idempotent: true,

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/discounts/${encodeURIComponent(input.discountId)}/`, {
      method: "DELETE",
    });
  },
};

export default action;
