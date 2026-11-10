import { resourceTrigger } from "../lib/triggers.ts";

export default resourceTrigger({
  key: "subscription-updated",
  title: "Subscription Updated",
  resource: "subscription_updated",
  subscription: true,
  description:
    "The run gets each membership upgrade or downgrade (type, effective date, old and new plan).",
  extra: [
    { key: "type", type: "string", label: "upgrade or downgrade" },
    { key: "effective_as_of", type: "string", label: "Effective as of" },
    { key: "old_plan", type: "object", label: "Plan before" },
    { key: "new_plan", type: "object", label: "Plan after" },
  ],
  sample: {
    "subscription_id": "sub_1",
    "product_id": "prod_1",
    "product_name": "Pencil Club",
    "user_email": "member@example.test",
    "created_at": "2026-11-01T10:00:00Z",
    "type": "upgrade",
    "effective_as_of": "2026-11-23T16:31:44Z",
    "old_plan": { "recurrence": "monthly", "price_cents": "1000", "quantity": 1 },
    "new_plan": { "recurrence": "yearly", "price_cents": "12000", "quantity": 1 },
  },
});
