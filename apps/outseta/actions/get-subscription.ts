import type { ActionDefinition } from "@w6w/types";
import { OutsetaClient, pathId } from "../lib/client.ts";

interface Input {
  subscriptionUid: string;
}

/** `GET /api/v1/billing/subscriptions/{subscriptionUid}` — Retrieve one subscription by Uid. */
const getSubscription: ActionDefinition<Input> = {
  key: "get-subscription",
  type: "read",
  resource: "billing",
  title: "Get Subscription",
  description: "Retrieve one subscription by Uid.",
  params: [
    {
      key: "subscriptionUid",
      label: "Subscription Uid",
      type: "string",
      hint: "The subscription's Uid (the short alphanumeric id, e.g. `wZmNZm2O`).",
      required: true,
    },
  ],
  output: [
    {
      key: "Uid",
      type: "string",
      label: "Uid",
    },
    {
      key: "Created",
      type: "string",
      label: "Created",
    },
    {
      key: "Updated",
      type: "string",
      label: "Updated",
    },
  ],

  execute(input, ctx) {
    return OutsetaClient.fromConnection(ctx).request(
      `/billing/subscriptions/${pathId(input.subscriptionUid)}`,
      { method: "GET" },
    );
  },
};

export default getSubscription;
