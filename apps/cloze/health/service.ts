import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Cloze publishes no status page this app can read (checked 2026-10-06): `status.cloze.com`
 * does not resolve, the OpenAPI document and developer site link none, and the one
 * `cloze.statuspage.io` path that answers 200 redirects to Atlassian's marketing page for
 * Statuspage itself, which is the catch-all signature, not a Cloze page. Declared absent;
 * `api` (reachability) and the derived `auth:*` check are the automatable signals.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Cloze platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Cloze publishes no machine-readable status page: status.cloze.com does not " +
      "resolve and the developer documentation links none. The `api` reachability check and " +
      "the derived `auth:*` check are the automatable signals.",
  },
};

export default service;
