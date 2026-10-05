import type { ActionDefinition } from "@w6w/types";
import { intId, SamCartClient } from "../lib/client.ts";

/** `PUT /v1/orders/{orderId}` */
interface Input {
  orderId: number;
  customFieldSlug: string;
  customFieldData: string;
}

const orderUpdateCustomField: ActionDefinition<Input> = {
  key: "order-update-custom-field",
  type: "perform",
  resource: "order",
  title: "Update Order Custom Field",
  description:
    "Set one custom field on an order, addressed by the field's slug. Setting the same value again is harmless.",
  idempotent: true,
  params: [
    {
      "key": "orderId",
      "label": "Order ID",
      "type": "number",
      "required": true,
      "validation": {
        "integer": true,
        "min": 1,
      },
    },
    {
      "key": "customFieldSlug",
      "label": "Custom field slug",
      "type": "string",
      "required": true,
      "hint": "The slug of the custom field, e.g. `custom_zL6FLFM3`.",
    },
    {
      "key": "customFieldData",
      "label": "New value",
      "type": "string",
      "required": true,
      "hint": "The new data for the custom field.",
    },
  ],
  output: [
    {
      "key": "response",
      "type": "object",
      "label": "The vendor response body (undocumented in the reference; null when empty)",
    },
  ],

  async execute(input, ctx) {
    const body = await new SamCartClient(ctx).call(
      "PUT",
      `/orders/${intId(input.orderId, "Order ID")}`,
      {
        json: {
          custom_field_slug: input.customFieldSlug,
          custom_field_data: input.customFieldData,
        },
      },
    );
    return { response: body };
  },
};

export default orderUpdateCustomField;
