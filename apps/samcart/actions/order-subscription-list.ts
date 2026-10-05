import type { ActionDefinition } from "@w6w/types";
import { intId, SamCartClient } from "../lib/client.ts";

/** `GET /v1/orders/{orderId}/subscriptions` */
interface Input {
  orderId: number;
  createdAtMin?: string;
  createdAtMax?: string;
  rebillingAtMin?: string;
  rebillingAtMax?: string;
  canceledAtMin?: string;
  canceledAtMax?: string;
  subscriptionStatus?: string;
  subscriptionType?: string;
  testMode?: string;
}

const orderSubscriptionList: ActionDefinition<Input> = {
  key: "order-subscription-list",
  type: "read",
  resource: "order",
  title: "List Order Subscriptions",
  description: "Subscriptions created by an order, with the subscription filters.",
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
      "key": "rebillingAtMin",
      "label": "Rebilling at or after",
      "type": "string",
      "hint": "ISO 8601 date-time with timezone (2025-01-16T14:30:00Z) or a date (2025-01-16).",
    },
    {
      "key": "rebillingAtMax",
      "label": "Rebilling at or before",
      "type": "string",
      "hint": "ISO 8601 date-time with timezone (2025-01-16T14:30:00Z) or a date (2025-01-16).",
    },
    {
      "key": "canceledAtMin",
      "label": "Canceled at or after",
      "type": "string",
      "hint": "ISO 8601 date-time with timezone (2025-01-16T14:30:00Z) or a date (2025-01-16).",
    },
    {
      "key": "canceledAtMax",
      "label": "Canceled at or before",
      "type": "string",
      "hint": "ISO 8601 date-time with timezone (2025-01-16T14:30:00Z) or a date (2025-01-16).",
    },
    {
      "key": "subscriptionStatus",
      "label": "Status",
      "type": "select",
      "options": [
        {
          "value": "active",
          "label": "active",
        },
        {
          "value": "canceled",
          "label": "canceled",
        },
        {
          "value": "delinquent",
          "label": "delinquent",
        },
        {
          "value": "completed",
          "label": "completed",
        },
        {
          "value": "paused",
          "label": "paused",
        },
        {
          "value": "invalid_processor",
          "label": "invalid_processor",
        },
        {
          "value": "sca_required",
          "label": "sca_required",
        },
        {
          "value": "deleted",
          "label": "deleted",
        },
      ],
    },
    {
      "key": "subscriptionType",
      "label": "Type",
      "type": "select",
      "options": [
        {
          "value": "limited_subscription",
          "label": "limited_subscription",
        },
        {
          "value": "recurring_subscription",
          "label": "recurring_subscription",
        },
      ],
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
      "key": "data",
      "type": "array",
      "label": "The returned records",
    },
  ],

  async execute(input, ctx) {
    const body = await new SamCartClient(ctx).call(
      "GET",
      `/orders/${intId(input.orderId, "Order ID")}/subscriptions`,
      {
        query: {
          created_at_min: input.createdAtMin,
          created_at_max: input.createdAtMax,
          rebilling_at_min: input.rebillingAtMin,
          rebilling_at_max: input.rebillingAtMax,
          canceled_at_min: input.canceledAtMin,
          canceled_at_max: input.canceledAtMax,
          status: input.subscriptionStatus,
          type: input.subscriptionType,
          test_mode: input.testMode,
        },
      },
    );
    return { data: Array.isArray(body) ? body : [] };
  },
};

export default orderSubscriptionList;
