import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Formsite is operated by Intellistack (formerly Formstack), whose status page
 * is status.formstack.com. It is an Atlassian-hosted HTML page: every
 * `/api/v2/*.json` path answers the same HTML shell rather than the Statuspage
 * JSON schema, and it carries no Formsite-specific API component we could
 * verify. Declaring the absence is a positive fact — the `domain` dependency
 * check probes this connection's own server instead.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, which would otherwise pin every verdict at `unknown`.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Formsite platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "status.formstack.com is an Intellistack-wide HTML page; /api/v2/summary.json and /api/v2/components.json return its HTML shell, not Statuspage JSON, and no Formsite API component is published. The `domain` dependency check probes this connection's own server instead.",
  },
};

export default service;
