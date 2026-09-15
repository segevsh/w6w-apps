import type { ActionDefinition } from "@w6w/types";
import { pathId, RecurlyClient } from "../lib/client.ts";

interface Input {
  subscriptionId: string;
}

/**
 * `GET /subscriptions/{subscription_id}` — fetch a single subscription.
 *
 * `subscriptionId` accepts Recurly's own ID with no prefix, or the
 * subscription's UUID prefixed `uuid-` — see `lib/client.ts` module doc §3.
 */
const getSubscription: ActionDefinition<Input> = {
  key: "get-subscription",
  type: "read",
  resource: "subscription",
  title: "Get Subscription",
  description: "Fetch a single subscription by Recurly ID or by UUID (prefixed `uuid-`).",
  params: [
    {
      key: "subscriptionId",
      label: "Subscription ID",
      type: "string",
      required: true,
      hint: "Recurly ID (`e28zov4fw0v2`) or UUID prefixed `uuid-` (`uuid-123457890`).",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Subscription ID" },
    { key: "state", type: "string", label: "State" },
    { key: "currency", type: "string", label: "Currency (ISO 4217)" },
    { key: "unit_amount", type: "number", label: "Unit amount, in the currency's major unit" },
    { key: "quantity", type: "number", label: "Quantity" },
  ],

  execute(input, ctx) {
    return RecurlyClient.fromConnection(ctx).request(
      `/subscriptions/${pathId(input.subscriptionId)}`,
    );
  },
};

export default getSubscription;
