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
    // Gumroad posts form-encoded, so nested objects arrive as bracket keys.
    { key: "old_plan[recurrence]", type: "string", label: "Plan before: recurrence" },
    { key: "old_plan[price_cents]", type: "string", label: "Plan before: price (cents)" },
    { key: "old_plan[quantity]", type: "string", label: "Plan before: quantity" },
    { key: "new_plan[recurrence]", type: "string", label: "Plan after: recurrence" },
    { key: "new_plan[price_cents]", type: "string", label: "Plan after: price (cents)" },
    { key: "new_plan[quantity]", type: "string", label: "Plan after: quantity" },
  ],
  sample: {
    "subscription_id": "sub_1",
    "product_id": "prod_1",
    "product_name": "Pencil Club",
    "user_email": "member@example.test",
    "created_at": "2026-11-01T10:00:00Z",
    "type": "upgrade",
    "effective_as_of": "2026-11-23T16:31:44Z",
    "old_plan[recurrence]": "monthly",
    "old_plan[price_cents]": "1000",
    "old_plan[quantity]": "1",
    "new_plan[recurrence]": "yearly",
    "new_plan[price_cents]": "12000",
    "new_plan[quantity]": "1",
  },
});
