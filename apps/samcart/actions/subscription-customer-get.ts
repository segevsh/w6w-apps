import type { ActionDefinition } from "@w6w/types";
import { intId, SamCartClient } from "../lib/client.ts";

/** `GET /v1/subscriptions/{subscriptionId}/customer` */
interface Input {
  subscriptionId: number;
}

const subscriptionCustomerGet: ActionDefinition<Input> = {
  key: "subscription-customer-get",
  type: "read",
  resource: "subscription",
  title: "Get Subscription Customer",
  description: "A subscription's customer.",
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
      `/subscriptions/${intId(input.subscriptionId, "Subscription ID")}/customer`,
    );
  },
};

export default subscriptionCustomerGet;
