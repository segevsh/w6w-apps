import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Vendor status — declared **unavailable**, and it is the right call twice
 * over.
 *
 * ## The status page publishes nothing machine-readable
 *
 * Probed on 2026-08-19: `status.nocodb.com` serves an HTML uptime page. The
 * usual JSON paths — `/api/v2/summary.json`, `/api/v1/monitors`, `/badge` —
 * all return 404. There is a page a person can read and no feed a check can.
 *
 * ## And it speaks for the cloud, which most NocoDB is not
 *
 * NocoDB is open source and self-hosted more often than not. `app.nocodb.com`
 * is one deployment of it, so its status says nothing about the instance a
 * given connection points at — the same shape of absence as `apps/mastodon`,
 * where there is software rather than a service.
 *
 * `health/instance.ts` answers the version of this question that can be
 * answered, and it does so through an **unauthenticated** endpoint, which
 * makes it both more specific and more truthful than a status page would be.
 */
const check: HealthCheckDefinition = {
  key: "service",
  kind: "service",
  scope: "app",
  credential: "none",
  title: "NocoDB status",
  description:
    "Declared unavailable twice over — NocoDB's status page publishes no machine-readable feed, " +
    "and it would speak only for the cloud, while most NocoDB is self-hosted. The `instance` " +
    "check reads the connection's own server instead.",
  covers: ["service"],
  severity: "informational",
  unavailable: {
    reason:
      "NocoDB publishes no machine-readable status. Measured on 2026-08-19: status.nocodb.com " +
      "serves an HTML uptime page, and `/api/v2/summary.json`, `/api/v1/monitors` and `/badge` " +
      "all return 404. It would also be the wrong instrument: NocoDB is open source and " +
      "self-hosted more often than not, so app.nocodb.com's health says nothing about the " +
      "instance a connection points at — software rather than a service, as with apps/mastodon. " +
      "The `instance` check reads this connection's own server through `/api/v1/health`, which " +
      "needs no credential and reports the process uptime.",
  },
};

export default check;
