import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is SendFox up? — declared absent, not faked.
 *
 * SendFox publishes **no status page**, and this was checked rather than
 * assumed. Four hosts were probed on 2026-09-22:
 *
 * | Host                     | Result                                                          |
 * | ------------------------ | --------------------------------------------------------------- |
 * | `status.sendfox.com`     | DNS failure — nothing to resolve                                 |
 * | `sendfoxstatus.com`      | DNS failure — nothing to resolve                                 |
 * | `sendfox.statuspage.io`  | 302 to the generic `statuspage.io` marketing site — **unclaimed** |
 * | `sendfox.instatus.com`   | 307 to the generic `instatus.com` marketing site — **unclaimed**  |
 *
 * The two vendor-owned hosts do not exist, and the two status-page providers
 * wildcard their zones, so a `*.statuspage.io` or `*.instatus.com` host that
 * *resolves* is not evidence of a page — a claimed page is one the vendor's own
 * documentation links, and neither SendFox's OpenAPI document nor its site does.
 *
 * `unavailable` is a first-class, honest answer per rfcs/healthcheck.md
 * "Declaring absence" — better than a silent gap or a `check` that always
 * returns `unknown`. `severity: "informational"` is load-bearing: an
 * `unavailable` entry always reports `unknown`, and `unknown` outranks `ok` in
 * the roll-up, so at any other severity this declared absence would pin the
 * app's verdict at `unknown` forever.
 *
 * Reachability and headroom are answered instead by the live checks that do
 * exist — the derived `auth:personal-access-token` probe (which makes a real
 * authenticated `GET /me`) and the `quota` check that reads the rate-limit
 * headers off it.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Vendor status page",
  description: "No machine-readable status surface: SendFox publishes no status page.",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "SendFox publishes no status page. status.sendfox.com and sendfoxstatus.com are NXDOMAIN; " +
      "sendfox.statuspage.io answers 302 to the generic statuspage.io marketing site and " +
      "sendfox.instatus.com answers 307 to the generic instatus.com marketing site, i.e. both " +
      "providers' wildcard zones are unclaimed for this vendor. The vendor's own OpenAPI " +
      "document names no status URL or incident feed. API reachability is reported instead by " +
      "the derived `auth:personal-access-token` check (a real authenticated GET /me) and " +
      "remaining request headroom by the `quota` check.",
  },
};

export default service;
