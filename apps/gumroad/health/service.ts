import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Gumroad up? — declared as an absence.
 *
 * `status.gumroad.com` exists and is Gumroad's own ("Gumroad Status", linked to
 * its own account), checked 2026-10-05. It is a single hand-built HTML page of
 * incident history ("Live from Pingdom"), with six named surfaces (including
 * `API`), no JSON and no feed: `/api/v2/summary.json`, `/index.json` and
 * `/history.atom` all answer a 404 "page could not be found". Reading it would
 * mean scraping prose out of markup, which a host-run probe should not do — a
 * wording change would silently turn it into a permanent "ok".
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Gumroad's status page (status.gumroad.com) is a hand-built HTML incident list backed by " +
      "Pingdom, with no JSON API and no Atom/RSS feed (summary.json, index.json and " +
      "history.atom all return 404). There is nothing machine-readable to probe; credential " +
      "liveness is covered by the derived auth check against GET /v2/user.",
  },
};

export default service;
