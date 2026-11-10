import subscriptionList from "../actions/subscription-list.ts";
import { feedTrigger } from "../lib/triggers.ts";

/** The run gets each Keap subscription that is new or was modified (`GET /rest/v2/subscriptions`, `order_by=modification_time desc`; Keap offers no created-time sort for subscriptions). Brief 9.1 (a), 9.2. */
export default feedTrigger({
  key: "new-or-updated-subscription",
  title: "New or Updated Subscription",
  description:
    "The run gets each Keap subscription that is new or was modified (`GET /rest/v2/subscriptions`, `order_by=modification_time desc`; Keap offers no created-time sort for subscriptions).",
  action: subscriptionList,
  list: "subscriptions",
  orderBy: "modification_time desc",
  stamp: "modification_time",
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "contact_id", type: "string", label: "Contact ID" },
    { key: "subscription_plan_id", type: "string", label: "Plan ID" },
    { key: "modification_time", type: "string", label: "Modified at" },
  ],
  sample: {
    id: "1",
    contact_id: "9",
    subscription_plan_id: "2",
    modification_time: "2026-11-10T12:30:00.000Z",
  },
});
