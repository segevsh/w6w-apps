import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Braintree publishes no status feed of its own. Verified 2026-10-06: the docs footer's "API
 * Status" link and `status.braintreepayments.com` both land on PayPal's company-wide page
 * (`www.paypal-status.com`, RSS title "PayPal Status - Event History", generator "PayPal Status
 * Feed Generator"), an HTML page whose feed lists incidents for every PayPal product with no
 * component or field that says "Braintree". Judging this app by it would report PayPal's
 * checkout incidents as Braintree outages. `informational` keeps the absence from pinning the
 * app's verdict at `unknown`; the `api` check answers whether the GraphQL endpoint is serving.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Braintree platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Braintree has no status feed of its own: status.braintreepayments.com is PayPal's " +
      "company-wide page, with no Braintree component to read. Verified 2026-10-06. The `api` " +
      "check probes the GraphQL endpoint directly.",
  },
};

export default service;
