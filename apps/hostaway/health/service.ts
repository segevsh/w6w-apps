/**
 * Is Hostaway up? — no status page exists to ask.
 *
 * Hostaway publishes no machine-readable status surface, verified live 2026-09-22:
 *
 *   - `status.hostaway.com` does not resolve at all (`getent hosts` returns nothing;
 *     the connection fails before HTTP starts).
 *   - `hostaway.statuspage.io` — the conventional Statuspage subdomain — is an
 *     UNCLAIMED page: it `302`s away to `https://www.statuspage.io/`, the vendor's own
 *     generic marketing site, rather than serving a Hostaway-branded board.
 *   - No status/statuspage/instatus link appears on `www.hostaway.com`, and the docs
 *     page (`api.hostaway.com/documentation`) names no status host — it points at
 *     `support@hostaway.com` for questions and bug reports instead.
 *
 * So the absence is declared rather than invented, and this App wires up no status URL
 * at all: `w6w.network.allow` is `["api.hostaway.com"]` and nothing here reaches a
 * status host.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always reports
 * `unknown`, and `unknown` outranks `ok` in a roll-up, so at any other severity this
 * declared absence would pin the App's verdict at `unknown` forever.
 *
 * What answers the question instead is the API itself: `api` (the signed probe),
 * `reachability` (the same probe unsigned, for the no-credential case) and the derived
 * `auth:client-credentials` check projected from the Auth method's `test` hook, which
 * re-runs the documented token exchange.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Hostaway platform status",
  description:
    "No status page exists: status.hostaway.com does not resolve and hostaway.statuspage.io " +
    "is an unclaimed subdomain that redirects to statuspage.io's own marketing site.",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Hostaway publishes no status page. status.hostaway.com does not resolve (checked " +
      "live 2026-09-22), and hostaway.statuspage.io - the conventional Statuspage subdomain - " +
      "is unclaimed: it 302-redirects to https://www.statuspage.io/, the status-page vendor's " +
      "own marketing site, not a Hostaway board. The docs page (api.hostaway.com/documentation) " +
      "names no status host and directs questions to support@hostaway.com instead. The `api` " +
      "and `reachability` probes of GET /v1/users?limit=1, plus the derived " +
      "auth:client-credentials check, are the automatable signals.",
  },
};

export default service;
