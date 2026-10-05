import type { ActionDefinition } from "@w6w/types";
import { page, SamCartClient } from "../lib/client.ts";

/** `GET /v1/refunds` */
interface Input {
  offset?: number;
  limit?: number;
  dir?: string;
}

const refundList: ActionDefinition<Input> = {
  key: "refund-list",
  type: "read",
  resource: "refund",
  title: "List Refunds",
  description: "Every refund for the marketplace, paginated.",
  params: [
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
      "label": "The refunds on this page",
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
      await new SamCartClient(ctx).call("GET", `/refunds`, {
        query: {
          offset: input.offset,
          limit: input.limit,
          dir: input.dir,
        },
      }),
    );
  },
};

export default refundList;
