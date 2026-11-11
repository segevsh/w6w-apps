import { resourceTrigger } from "../lib/triggers.ts";

export default resourceTrigger({
  key: "subscription-cancelled",
  title: "Subscription Cancelled",
  resource: "cancellation",
  subscription: true,
  description:
    "The run gets each membership cancellation (cancelled, cancelled_at and who cancelled).",
  extra: [
    { key: "cancelled", type: "string", label: "Cancelled" },
    { key: "cancelled_at", type: "string", label: "Cancelled at" },
  ],
  sample: {
    "subscription_id": "sub_1",
    "product_id": "prod_1",
    "product_name": "Pencil Club",
    "user_email": "member@example.test",
    "created_at": "2026-11-01T10:00:00Z",
    "cancelled": "true",
    "cancelled_at": "2026-12-01T00:00:00Z",
    "cancelled_by_buyer": "true",
  },
});
