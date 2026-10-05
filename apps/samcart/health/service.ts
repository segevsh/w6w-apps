import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is SamCart up? — declared as an absence.
 *
 * Checked 2026-10-05: `status.samcart.com` 302s to `samcart.com`, which 301s to
 * the marketing site's `www.samcart.com` and answers 200 HTML for every path
 * tried (`/api/v2/summary.json`, `/index.json`) — it is not a status page.
 * `samcart.statuspage.io/api/v2/summary.json` answers a 401 JSON (`Your page is
 * inactive`), i.e. an unclaimed/inactive Statuspage, and neither the marketing
 * site's links nor the developer portal link to any status page. Nothing
 * machine-readable exists to read.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Platform status",
  kind: "service",
  severity: "informational",
  unavailable: {
    reason:
      "SamCart publishes no status page: status.samcart.com redirects to the marketing site " +
      "(HTML for every path) and samcart.statuspage.io is an inactive Statuspage, so there is " +
      "nothing to probe. Credential liveness is covered by the derived auth check against " +
      "GET /v1/products.",
  },
};

export default service;
