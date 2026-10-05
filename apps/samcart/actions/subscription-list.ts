import type { ActionDefinition } from "@w6w/types";
import { page, SamCartClient } from "../lib/client.ts";

/** `GET /v1/subscriptions` */
interface Input {
  createdAtMin?: string;
  createdAtMax?: string;
  rebillingAtMin?: string;
  rebillingAtMax?: string;
  canceledAtMin?: string;
  canceledAtMax?: string;
  subscriptionStatus?: string;
  subscriptionType?: string;
  testMode?: string;
  offset?: number;
  limit?: number;
  dir?: string;
}

const subscriptionList: ActionDefinition<Input> = {
  key: "subscription-list",
  type: "read",
  resource: "subscription",
  title: "List Subscriptions",
  description:
    "Subscriptions, paginated, with created/rebilling/canceled date, status and type filters.",
  params: [
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
    {
      "key": "offset",
      "label": "Offset",
      "type": "number",
      "hint": "`nextOffset` from the previous page. Leave empty for the first page.",
      "validation": {
        "integer": true,
        "min": 0,
      },
    },
    {
      "key": "limit",
      "label": "Limit",
      "type": "number",
      "hint": "Page size, 1-100. Defaults to 100.",
      "validation": {
        "integer": true,
        "min": 1,
        "max": 100,
      },
    },
    {
      "key": "dir",
      "label": "Direction",
      "type": "select",
      "options": [
        {
          "value": "next",
          "label": "Next",
        },
        {
          "value": "prev",
          "label": "Previous",
        },
      ],
      "hint": "`prev` pages backwards from the offset.",
    },
  ],
  output: [
    {
      "key": "data",
      "type": "array",
      "label": "The subscriptions on this page",
    },
    {
      "key": "next",
      "type": "string",
      "label": "URL of the next page; null on the last page",
    },
    {
      "key": "prev",
      "type": "string",
      "label": "URL of the previous page; null on the first page",
    },
    {
      "key": "nextOffset",
      "type": "string",
      "label": "Pass as Offset to fetch the next page; null on the last page",
    },
  ],

  async execute(input, ctx) {
    return page(
      await new SamCartClient(ctx).call("GET", `/subscriptions`, {
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
          offset: input.offset,
          limit: input.limit,
          dir: input.dir,
        },
      }),
    );
  },
};

export default subscriptionList;
