import type { ActionDefinition } from "@w6w/types";
import { pathId, RecurlyClient } from "../lib/client.ts";

interface Input {
  subscriptionId: string;
  timeframe?: "bill_date" | "term_end";
}

/**
 * `PUT /subscriptions/{subscription_id}/cancel` — cancel a subscription.
 *
 * This schedules an expiration rather than terminating immediately — Recurly
 * documents `timeframe` as controlling WHEN the subscription actually stops:
 * `bill_date` expires it at the next scheduled bill; `term_end` (the default)
 * keeps it billing until the term completes, then expires it. Neither option
 * is an instant, unbilled cancellation — that is `DELETE /subscriptions/{id}`
 * (terminate), deliberately not exposed here because it can also issue a
 * refund depending on query parameters this action does not surface.
 *
 * Idempotent: canceling an already-canceled subscription converges on the
 * same state rather than erroring in a way a retry needs to handle specially.
 */
const cancelSubscription: ActionDefinition<Input> = {
  key: "cancel-subscription",
  type: "perform",
  resource: "subscription",
  title: "Cancel Subscription",
  description: "Schedule a subscription to expire at the next bill date or at the end of its term.",
  idempotent: true,
  params: [
    {
      key: "subscriptionId",
      label: "Subscription ID",
      type: "string",
      required: true,
      hint: "Recurly ID or UUID prefixed `uuid-`.",
    },
    {
      key: "timeframe",
      label: "Timeframe",
      type: "select",
      default: "term_end",
      options: [
        { value: "bill_date", label: "At the next scheduled bill date" },
        { value: "term_end", label: "At the end of the current term (keeps billing until then)" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Subscription ID" },
    { key: "state", type: "string", label: "State" },
    { key: "expires_at", type: "string", label: "When the subscription will expire" },
  ],

  execute(input, ctx) {
    return RecurlyClient.fromConnection(ctx).request(
      `/subscriptions/${pathId(input.subscriptionId)}/cancel`,
      { method: "PUT", json: { timeframe: input.timeframe } },
    );
  },
};

export default cancelSubscription;
