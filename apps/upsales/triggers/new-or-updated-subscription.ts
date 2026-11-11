import subscriptionList from "../actions/subscription-list.ts";
import { updatedListTrigger } from "../lib/list-trigger.ts";
export default updatedListTrigger({
  key: "new-or-updated-subscription",
  title: "New or Updated Subscription",
  noun: "subscription",
  action: subscriptionList,
  output: [
    { key: "id", type: "number", label: "Subscription ID" },
    { key: "modDate", type: "string", label: "Modified at" },
  ],
  sample: { id: 1, modDate: "2026-11-10T00:00:00Z" },
});
