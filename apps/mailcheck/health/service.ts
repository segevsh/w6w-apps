/**
 * Is Mailcheck up? — declared absent.
 *
 * Verified 2026-08-01: mailcheck.co's marketing site links no status page, and
 * neither of the two hosted-status-page conventions vendors commonly use
 * resolves to a Mailcheck-branded page — `mailcheck.statuspage.io` redirects
 * to Atlassian's generic Statuspage marketing site, and `mailcheck.instatus.com`
 * serves Instatus's generic "get ready for downtime" placeholder. No
 * `/feed.rss` or `/feed.atom` exists on either. The live OpenAPI document at
 * https://app.mailcheck.co/openapi.json lists no status endpoint either.
 *
 * Per rfcs/healthcheck.md: "Say so when a vendor publishes nothing" — an
 * `unavailable` entry is a first-class answer, not a gap. Credential liveness
 * is still covered by the derived `auth:api-key` check (see `auth/api-key.ts`
 * `test`), which is the only of the three health questions this API supports
 * verifying today: it exposes no quota/credits endpoint either, so no `quota`
 * check is declared.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Mailcheck platform status",
  kind: "service",
  severity: "informational",
  unavailable: {
    reason:
      "Mailcheck publishes no status page or status feed (checked mailcheck.co, mailcheck.statuspage.io, mailcheck.instatus.com — none resolve to a vendor-branded status surface).",
  },
};

export default service;
