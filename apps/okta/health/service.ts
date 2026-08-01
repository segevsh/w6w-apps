import type { HealthCheckDefinition } from "@w6w/types";

/**
 * status.okta.com renders incident/uptime data as JSON embedded inside the
 * HTML page itself (Salesforce-shaped field names — `Status__c`, `Log__c`,
 * …) — there is no separate JSON API endpoint and no Atom/RSS feed to point
 * `feed` at. Parsing markup out of a page a vendor could restyle at any time
 * is exactly the kind of guess `rfcs/healthcheck.md` says to avoid, so this
 * declares the absence honestly instead.
 *
 * `severity: "informational"` is load-bearing here. An `unavailable` entry
 * always reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at
 * any other severity a declared absence would pin every verdict at `unknown`
 * forever. Informational checks never worsen a verdict; they are carried for
 * display.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Okta platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "status.okta.com has no JSON API and no Atom/RSS feed — its incident and uptime data is " +
      "embedded as page-specific JSON inside the HTML, not published as a stable machine-readable " +
      "format. Credential liveness is covered by the derived `auth:api-token` check instead.",
  },
};

export default service;
