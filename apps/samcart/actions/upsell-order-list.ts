import type { ActionDefinition } from "@w6w/types";
import { intId, page, SamCartClient } from "../lib/client.ts";

/** `GET /v1/upsells/{upsellId}/orders` */
interface Input {
  upsellId: number;
  createdAtMin?: string;
  createdAtMax?: string;
  testMode?: string;
  offset?: number;
  limit?: number;
  dir?: string;
}

const upsellOrderList: ActionDefinition<Input> = {
  key: "upsell-order-list",
  type: "read",
  resource: "order",
  title: "List Upsell Orders",
  description: "Orders that include a purchase of an upsell, paginated.",
  params: [
    {
      "key": "upsellId",
      "label": "Upsell ID",
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
      "label": "The orders on this page",
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
      await new SamCartClient(ctx).call(
        "GET",
        `/upsells/${intId(input.upsellId, "Upsell ID")}/orders`,
        {
          query: {
            created_at_min: input.createdAtMin,
            created_at_max: input.createdAtMax,
            test_mode: input.testMode,
            offset: input.offset,
            limit: input.limit,
            dir: input.dir,
          },
        },
      ),
    );
  },
};

export default upsellOrderList;
