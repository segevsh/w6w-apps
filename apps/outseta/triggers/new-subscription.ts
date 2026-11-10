import action from "../actions/list-subscriptions.ts";
import { recordFeed } from "../lib/triggers.ts";

export default recordFeed({
  key: "new-subscription",
  title: "New Subscription",
  description: "The run gets each newly created Outseta subscription (newest first).",
  action,
  output: [
    { key: "Uid", type: "string", label: "Subscription Uid" },
    { key: "BillingRenewalTerm", type: "number", label: "Billing renewal term" },
    { key: "Created", type: "string", label: "Created" },
  ],
  sample: { Uid: "yaQz7Km1", BillingRenewalTerm: 1, Created: "2026-11-10T09:00:00Z" },
});
