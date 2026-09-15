import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declares that no quota/rate-limit signal exists — a positive fact, not an omission.
 *
 * Checked on 2026-09-15 against AddEvent's "Getting started" and "Response codes &
 * errors" reference pages and the full OpenAPI 3.1 document: none of the three
 * mentions a request-rate ceiling, a metered API quota, or any `X-RateLimit-*`
 * response header. The only quantitative limit AddEvent documents at all is
 * `page_size` (max 20 per search page), which is a pagination cap, not usage
 * metering. A live probe's response headers were also inspected and carried no
 * rate-limit fields.
 *
 * `severity: "informational"` per the app-pack convention: `unknown` (what a
 * permanent absence reports) outranks `ok` in a roll-up, so leaving this at the
 * `degraded` default for `kind: "quota"` would pin the App's overall verdict there
 * forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Plan headroom",
  kind: "quota",
  severity: "informational",
  covers: ["*"],
  unavailable: {
    reason: "AddEvent publishes no rate-limit or usage-quota signal — no response headers and " +
      "no metering endpoint are documented anywhere in its API reference.",
  },
};

export default quota;
