import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `DELETE /v2/resource_subscriptions/:resourceSubscriptionId`
 */
interface Input {
  resourceSubscriptionId: string;
}

const resourceSubscriptionDelete: ActionDefinition<Input> = {
  key: "resource-subscription-delete",
  type: "perform",
  resource: "webhook",
  title: "Unsubscribe from Resource",
  description: "Delete a resource subscription.",
  idempotent: false,
  params: [{
    "key": "resourceSubscriptionId",
    "label": "Subscription ID",
    "type": "string",
    "required": true,
  }],
  output: [{ "key": "message", "type": "string", "label": "Confirmation from Gumroad" }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call(
      "DELETE",
      `/resource_subscriptions/${seg(input.resourceSubscriptionId)}`,
    );
    return { message: body.message ?? null };
  },
};

export default resourceSubscriptionDelete;
