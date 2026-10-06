import type { HealthCheckDefinition } from "@w6w/types";

/**
 * MillionVerifier publishes no status page (checked 2026-10-06). `status.millionverifier.com`
 * answers a 200 that redirects to the marketing home page (`<title>The #1 Email Verification
 * Service - MillionVerifier</title>`, 51 KB) — a catch-all, not a status page — and
 * `millionverifier.statuspage.io` redirects to Atlassian's Statuspage marketing site. Declared
 * absent; `api` (reachability) and the derived `auth:*` check are the automatable signals.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "MillionVerifier platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "MillionVerifier publishes no status page or feed: status.millionverifier.com " +
      "redirects to the marketing home page and the statuspage.io name to Atlassian's " +
      "marketing site. The `api` reachability check and the derived `auth:*` check are the " +
      "automatable signals.",
  },
};

export default service;
