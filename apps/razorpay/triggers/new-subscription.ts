import { sinceFeed } from "../lib/triggers.ts";
import subscriptionList from "../actions/subscription-list.ts";

export default sinceFeed({
  key: "new-subscription",
  title: "New Subscription",
  description: "The run gets each subscription newly created on the account.",
  action: subscriptionList as never,
  output: [
    { key: "id", type: "string", label: "Subscription ID" },
    { key: "plan_id", type: "string", label: "Plan ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "number", label: "Created (unix seconds)" },
  ],
  sample: { id: "sub_1", plan_id: "plan_1", status: "created", created_at: 1700000000 },
});
