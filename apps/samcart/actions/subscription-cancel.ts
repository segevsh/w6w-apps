import type { ActionDefinition } from "@w6w/types";
import { intId, SamCartClient } from "../lib/client.ts";

/** `POST /v1/subscriptions/{subscriptionId}/cancel` */
interface Input {
  subscriptionId: number;
  silentCancel?: boolean;
}

const subscriptionCancel: ActionDefinition<Input> = {
  key: "subscription-cancel",
  type: "perform",
  resource: "subscription",
  title: "Cancel Subscription",
  description:
    "Cancel a subscription now. It must be active, delinquent or paused (otherwise 409). Retrying after success fails with a 409 rather than canceling twice.",
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
      "key": "silentCancel",
      "label": "Silent cancel",
      "type": "boolean",
      "hint": "Do not notify the customer of the cancelation.",
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
      `/subscriptions/${intId(input.subscriptionId, "Subscription ID")}/cancel`,
      {
        json: {
          silent_cancel: input.silentCancel,
        },
      },
    );
  },
};

export default subscriptionCancel;
