import { getAction } from "../lib/factory.ts";

/** `GET /subscription/{code}`. */
export default getAction({
  key: "subscription-get",
  title: "Get Subscription",
  description: "Fetch a subscription by code, including its `email_token` and next payment date.",
  resource: "subscription",
  path: "/subscription/{id}",
  idLabel: "Subscription code",
  idHint: "e.g. SUB_5co81xgmwg78x3d",
  output: [
    { key: "subscription_code", type: "string", label: "Subscription code" },
    { key: "status", type: "string", label: "Status" },
    { key: "email_token", type: "string", label: "Email token" },
    { key: "next_payment_date", type: "string", label: "Next payment date" },
    { key: "plan", type: "object", label: "Plan" },
    { key: "customer", type: "object", label: "Customer" },
  ],
});
