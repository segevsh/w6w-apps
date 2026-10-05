import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `GET /v2/subscribers/:subscriberId`
 * Needs the `view_sales` or `account` scope.
 */
interface Input {
  subscriberId: string;
}

const subscriberGet: ActionDefinition<Input> = {
  key: "subscriber-get",
  type: "read",
  resource: "subscriber",
  title: "Get Subscriber",
  description:
    "Fetch one subscriber. `status` is one of alive, payment_method_update_required, pending_cancellation, pending_failure, failed_payment, fixed_subscription_period_ended, cancelled. Needs the `view_sales` or `account` scope.",
  params: [{ "key": "subscriberId", "label": "Subscriber ID", "type": "string", "required": true }],
  output: [{ "key": "id", "type": "string", "label": "Subscriber id" }, {
    "key": "status",
    "type": "string",
    "label": "Subscription status",
  }, { "key": "user_email", "type": "string", "label": "Subscriber email" }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call(
      "GET",
      `/subscribers/${seg(input.subscriberId)}`,
    );
    // Gumroad's own example wraps the single subscriber under the PLURAL key `subscribers`;
    // accept the singular too in case that is corrected.
    return body.subscriber ?? body.subscribers;
  },
};

export default subscriberGet;
