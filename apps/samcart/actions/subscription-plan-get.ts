import type { ActionDefinition } from "@w6w/types";
import { intId, SamCartClient } from "../lib/client.ts";

/** `GET /v1/subscriptions/{subscriptionId}/plan` */
interface Input {
  subscriptionId: number;
  createdAtMin?: string;
  createdAtMax?: string;
}

const subscriptionPlanGet: ActionDefinition<Input> = {
  key: "subscription-plan-get",
  type: "read",
  resource: "subscription",
  title: "Get Subscription Plan",
  description: "A subscription's plan: price, frequency, duration, trial and rebill days.",
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
      "key": "id",
      "type": "number",
      "label": "Subscription id",
    },
    {
      "key": "status",
      "type": "string",
      "label": "Status",
    },
  ],

  async execute(input, ctx) {
    return await new SamCartClient(ctx).call(
      "GET",
      `/subscriptions/${intId(input.subscriptionId, "Subscription ID")}/plan`,
      {
        query: {
          created_at_min: input.createdAtMin,
          created_at_max: input.createdAtMax,
        },
      },
    );
  },
};

export default subscriptionPlanGet;
