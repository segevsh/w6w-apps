import { listAction } from "../lib/factory.ts";

/** `GET /v1/payment-conditions` — bare array; one entry has `organizationDefault: true`. */
export default listAction({
  key: "payment-condition-list",
  title: "List Payment Conditions",
  description: "Payment conditions configured in Lexware (term, discount), including the " +
    "organization default.",
  resource: "payment-condition",
  path: "/payment-conditions",
  paged: false,
});
