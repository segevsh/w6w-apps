import type { ActionDefinition } from "@w6w/types";
import { intId, SamCartClient } from "../lib/client.ts";

/** `GET /v1/subscriptions/{subscriptionId}/history` */
interface Input {
  subscriptionId: number;
  createdAtMin?: string;
  createdAtMax?: string;
}

const subscriptionHistoryList: ActionDefinition<Input> = {
  key: "subscription-history-list",
  type: "read",
  resource: "subscription",
  title: "List Subscription History",
  description: "A subscription's status changes (new status, source, type, date).",
  params: [
    {
      "key": "subscriptionId",
      "label": "Subscription ID",
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
      `/subscriptions/${intId(input.subscriptionId, "Subscription ID")}/history`,
      {
        query: {
          created_at_min: input.createdAtMin,
          created_at_max: input.createdAtMax,
        },
      },
    );
    return { data: Array.isArray(body) ? body : [] };
  },
};

export default subscriptionHistoryList;
