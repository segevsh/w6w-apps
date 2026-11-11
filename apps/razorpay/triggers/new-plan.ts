import { boundedList } from "../lib/triggers.ts";
import planList from "../actions/plan-list.ts";

export default boundedList({
  key: "new-plan",
  title: "New Plan",
  description: "The run gets each subscription plan newly created on the account.",
  action: planList as never,
  paged: true,
  output: [
    { key: "id", type: "string", label: "Plan ID" },
    { key: "interval", type: "number", label: "Billing interval" },
    { key: "period", type: "string", label: "Billing period" },
    { key: "created_at", type: "number", label: "Created (unix seconds)" },
  ],
  sample: { id: "plan_1", interval: 1, period: "monthly", created_at: 1700000000 },
});
