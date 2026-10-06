import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Leadfeeder meters credits per account (`GET /v1/accounts?account_id=…` returns
 * `credits.available/used/remaining`) and a monthly request quota (`429 quota_exceeded`), but
 * every one of those reads needs an `account_id` the health framework does not hold, and the
 * OpenAPI document declares no rate-limit headers on any response (`headers` carries only
 * `WWW-Authenticate`). Declared absence; use the List Accounts / Get Usage actions in a workflow
 * to read headroom. `informational` keeps the permanent `unknown` off the app's verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Credit balances are read per account (GET /v1/accounts with an account_id) and the " +
      "API documents no rate-limit response headers, so no scope-free headroom reading exists.",
  },
};

export default quota;
