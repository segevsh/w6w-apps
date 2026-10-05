import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Read AI's only documented limit is 100 requests/minute per user, enforced as a
 * `429`. The docs describe no rate-limit header and no usage endpoint, and a
 * headroom probe would itself spend the budget. Declared unavailable, and
 * `informational` so the permanent `unknown` never pins the app's verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Read AI enforces 100 requests per minute per user and answers 429 beyond it, but its " +
      "documentation describes no rate-limit response header and no usage endpoint, so " +
      "remaining headroom cannot be read.",
  },
};

export default quota;
