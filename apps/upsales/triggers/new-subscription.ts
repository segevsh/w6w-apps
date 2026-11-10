import subscriptionList from "../actions/subscription-list.ts";
import { listTrigger } from "../lib/list-trigger.ts";
export default listTrigger({
  key: "new-subscription",
  title: "New Subscription",
  action: subscriptionList,
  output: [{ key: "id", type: "number", label: "Subscription ID" }],
  sample: { id: 1, regDate: "2026-11-10T00:00:00Z" },
});
