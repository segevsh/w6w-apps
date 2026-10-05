import type { ActionDefinition } from "@w6w/types";
import { intId, SamCartClient } from "../lib/client.ts";

/** `POST /v1/subscriptions/{subscriptionId}/update` */
interface Input {
  subscriptionId: number;
  nextRebillingDate: string;
}

const subscriptionUpdateRebillingDate: ActionDefinition<Input> = {
  key: "subscription-update-rebilling-date",
  type: "perform",
  resource: "subscription",
  title: "Update Next Rebilling Date",
  description:
    "Move a subscription's next rebilling date. Must be a future date; the subscription must be active or delinquent. Sending the same date again is harmless.",
  idempotent: true,
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
      "key": "nextRebillingDate",
      "label": "Next rebilling date",
      "type": "string",
      "required": true,
      "hint":
        "ISO 8601 date-time in the future, e.g. 2026-06-15T00:00:00Z. For Stripe-managed subscriptions, within 2 years.",
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
      "POST",
      `/subscriptions/${intId(input.subscriptionId, "Subscription ID")}/update`,
      {
        json: {
          next_rebilling_date: input.nextRebillingDate,
        },
      },
    );
  },
};

export default subscriptionUpdateRebillingDate;
