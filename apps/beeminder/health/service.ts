import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Beeminder publishes no status feed this app can read (checked 2026-10-06).
 * `status.beeminder.com` 302s to `doc.beeminder.com/statusminder`, a real page titled
 * "Beeminder Status Page" — but it is a hand-maintained documentation page on the help-docs
 * site, not a machine-readable status service (no JSON, RSS or Atom). Declared absent; `api`
 * (reachability) and the derived `auth:*` check are the automatable signals.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Beeminder platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "status.beeminder.com redirects to doc.beeminder.com/statusminder, a hand-maintained " +
      "documentation page with no JSON, RSS or Atom feed. The `api` reachability check and the " +
      "derived `auth:*` check are the automatable signals.",
  },
};

export default service;
