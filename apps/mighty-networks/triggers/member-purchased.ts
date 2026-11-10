import { webhookTrigger } from "../lib/triggers.ts";

/** Member Purchased (the `MemberPurchased` webhook event). */
const memberPurchased = webhookTrigger({
  key: "member-purchased",
  title: "Member Purchased",
  description:
    "Fires when a member purchases a plan. The run gets the event id and time and the payload: the member, the plan (id, name, amount, currency, interval) and the purchase (id, payment platform, purchased time).",
  eventTypes: ["MemberPurchased"],
  sample: {
    eventId: "sample-event-id",
    eventType: "MemberPurchased",
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
      plan: {
        id: 333,
        name: "Pro",
        amount: 2900,
        currency: "usd",
        interval: "month",
        type: "subscription",
        has_free_trial: false,
      },
      purchase: { id: 444, payment_platform: "stripe", purchased_at: "2026-11-10T10:30:00Z" },
    },
  },
});

export default memberPurchased;
