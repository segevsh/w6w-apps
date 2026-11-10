import { resourceTrigger } from "../lib/triggers.ts";

export default resourceTrigger({
  key: "subscription-restarted",
  title: "Subscription Restarted",
  resource: "subscription_restarted",
  subscription: true,
  description: "The run gets each membership a subscriber restarts after it had ended.",
  extra: [
    { key: "restarted_at", type: "string", label: "Restarted at" },
  ],
  sample: {
    "subscription_id": "sub_1",
    "product_id": "prod_1",
    "product_name": "Pencil Club",
    "user_email": "member@example.test",
    "created_at": "2026-11-01T10:00:00Z",
    "restarted_at": "2026-12-10T00:00:00Z",
  },
});
