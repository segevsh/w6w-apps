import type { ActionDefinition } from "@w6w/types";
import { intId, SamCartClient } from "../lib/client.ts";

/** `GET /v1/orders/{orderId}` */
interface Input {
  orderId: number;
  createdAtMin?: string;
  createdAtMax?: string;
  testMode?: string;
}

const orderGet: ActionDefinition<Input> = {
  key: "order-get",
  type: "read",
  resource: "order",
  title: "Get Order",
  description: "One order with its cart items, totals, custom fields and UTM data.",
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
      "key": "createdAtMin",
      "label": "Created at or after",
      "type": "string",
      "hint":
        "ISO 8601 date-time with timezone (2025-01-16T14:30:00Z) or a date (2025-01-16). A bare date means 00:00:00 UTC.",
    },
    {
      "key": "createdAtMax",
      "label": "Created at or before",
      "type": "string",
      "hint":
        "ISO 8601 date-time with timezone (2025-01-16T14:30:00Z) or a date (2025-01-16). A bare date means 23:59:59 UTC.",
    },
    {
      "key": "testMode",
      "label": "Test mode",
      "type": "select",
      "options": [
        {
          "value": "true",
          "label": "Test only",
        },
        {
          "value": "false",
          "label": "Live only",
        },
      ],
      "hint": "Leave empty for both.",
    },
  ],
  output: [
    {
      "key": "id",
      "type": "number",
      "label": "Order id",
    },
  ],

  async execute(input, ctx) {
    return await new SamCartClient(ctx).call("GET", `/orders/${intId(input.orderId, "Order ID")}`, {
      query: {
        created_at_min: input.createdAtMin,
        created_at_max: input.createdAtMax,
        test_mode: input.testMode,
      },
    });
  },
};

export default orderGet;
