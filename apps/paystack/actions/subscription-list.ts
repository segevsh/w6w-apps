import { dateRangeParams, listAction, paginationParams } from "../lib/factory.ts";

/** `GET /subscription`. */
export default listAction({
  key: "subscription-list",
  title: "List Subscriptions",
  description: "List subscriptions, optionally for one customer or plan.",
  resource: "subscription",
  path: "/subscription",
  query: { customer: "customer", plan: "plan" },
  params: [
    { key: "customer", label: "Customer id", type: "string", hint: "Numeric customer id." },
    { key: "plan", label: "Plan id", type: "string", hint: "Numeric plan id." },
    ...dateRangeParams,
    ...paginationParams,
  ],
});
