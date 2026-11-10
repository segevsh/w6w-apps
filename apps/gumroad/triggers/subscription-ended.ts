import { resourceTrigger } from "../lib/triggers.ts";

export default resourceTrigger({
  key: "subscription-ended",
  title: "Subscription Ended",
  resource: "subscription_ended",
  subscription: true,
  description:
    "The run gets each membership that has officially ended (cancelled, failed payment or fixed period over).",
  extra: [
    { key: "ended_at", type: "string", label: "Ended at" },
    { key: "ended_reason", type: "string", label: "Ended reason" },
  ],
  sample: {
    "subscription_id": "sub_1",
    "product_id": "prod_1",
    "product_name": "Pencil Club",
    "user_email": "member@example.test",
    "created_at": "2026-11-01T10:00:00Z",
    "ended_at": "2026-12-01T00:00:00Z",
    "ended_reason": "cancelled",
  },
});
