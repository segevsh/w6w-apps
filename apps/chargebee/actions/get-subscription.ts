import type { ActionDefinition } from "@w6w/types";
import { ChargebeeClient, pathId } from "../lib/client.ts";

interface Input {
  subscriptionId: string;
}

/**
 * `GET /subscriptions/{subscription-id}` — retrieve one subscription.
 *
 * Takes no query parameters, so this action has exactly one. The response is
 * `{ subscription, customer, card? }` — Chargebee returns the owning customer
 * alongside the subscription, which saves a second call and is why the output
 * declares all three.
 *
 * This returns the subscription as it stands TODAY. Chargebee has a separate
 * endpoint for the version including pending changes
 * (`/retrieve_with_scheduled_changes`); this action does not silently substitute
 * it, because "what is the customer being billed for right now" and "what will
 * they be billed for after the scheduled change lands" are different questions.
 */
const getSubscription: ActionDefinition<Input> = {
  key: "get-subscription",
  type: "read",
  resource: "subscription",
  title: "Get Subscription",
  description:
    "Retrieve a single subscription by id, along with its customer. Reflects the current state, " +
    "not any scheduled changes.",
  params: [
    { key: "subscriptionId", label: "Subscription ID", type: "string", required: true },
  ],
  output: [
    { key: "subscription", type: "object", label: "Subscription" },
    { key: "customer", type: "object", label: "Owning customer" },
    { key: "card", type: "object", label: "Card, if any" },
  ],

  execute(input, ctx) {
    return ChargebeeClient.fromConnection(ctx).request(
      `/subscriptions/${pathId(input.subscriptionId)}`,
    );
  },
};

export default getSubscription;
