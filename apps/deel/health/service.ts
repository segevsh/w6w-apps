/**
 * Is Deel up? — declared absent, because Deel's status page is not public.
 *
 * This one is unusual, and worth stating precisely: Deel *has* a Statuspage
 * account, and it deliberately does not serve it. Verified 2026-08-18:
 *
 *   GET https://status.deel.com/api/v2/status.json   -> 404
 *   GET https://status.deel.com/api/v2/summary.json  -> 404
 *   GET https://deel.statuspage.io/api/v2/status.json
 *       -> 401 "Your page is inactive. Please include an API key to access
 *          this resource."
 *
 * That 401 is Statuspage's own message for a page whose owner has not made it
 * public. So there is nothing to parse and nothing to declare as a feed — not
 * because the vendor publishes nothing, but because what it publishes is
 * private. Inventing a probe against an endpoint that answers 401 for everyone
 * would report `unknown` forever while looking like a live check.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up — so at any
 * other severity this absence would pin the app's verdict permanently.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Deel platform status",
  description:
    "Deel's Statuspage exists but is not public, so no machine-readable status surface is " +
    "available.",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "status.deel.com returns 404 on the standard Statuspage paths, and deel.statuspage.io " +
      'answers 401 "Your page is inactive. Please include an API key to access this ' +
      "resource\" — Statuspage's own message for a page its owner has not published " +
      "(verified 2026-08-18). There is no public status API, feed or page to probe.",
  },
};

export default service;
