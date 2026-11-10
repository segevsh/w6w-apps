import { webhookTrigger } from "../lib/triggers.ts";

/** Subscription Canceled (the `MemberSubscriptionCanceled` webhook event). */
const memberSubscriptionCanceled = webhookTrigger({
  key: "member-subscription-canceled",
  title: "Subscription Canceled",
  description:
    "Fires when a member cancels their subscription. The run gets the event id and time and the payload: the member, the plan and the subscription (id, current period, canceled time).",
  eventTypes: ["MemberSubscriptionCanceled"],
  sample: {
    eventId: "sample-event-id",
    eventType: "MemberSubscriptionCanceled",
    eventTimestamp: "2026-11-10T10:30:00Z",
    payload: {
      member: {
        id: 67890,
        email: "ada@example.com",
        first_name: "Ada",
        last_name: "Lovelace",
        member_type: "member",
      },
      member_id: 67890,
      plan: { id: 333, name: "Pro", amount: 2900, currency: "usd", interval: "month" },
      subscription: {
        id: 555,
        current_period_end: "2026-12-10T10:30:00Z",
        canceled_at: "2026-11-10T10:30:00Z",
      },
    },
  },
});

export default memberSubscriptionCanceled;
