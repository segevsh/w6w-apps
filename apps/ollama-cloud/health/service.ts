import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Ollama Cloud publishes no status feed this app can read.
 *
 * The vendor's status surface is not a machine-readable feed (unlike, say,
 * Mistral's `status.mistral.ai/feed.rss`), so nothing is invented here: a parsed
 * HTML page is not a contract, and a wrong answer to "is the platform up" is
 * worse than a declared absence. Whether *this account's* connection works is
 * the per-connection `instance` check (`GET /api/version`).
 *
 * `informational` keeps this declared absence from pinning the app's verdict at
 * `unknown`.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Ollama Cloud platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Ollama Cloud publishes no machine-readable status feed, so there is nothing to " +
      "parse here. Whether the platform is answering THIS connection is the per-connection " +
      "`instance` check (GET /api/version).",
  },
};

export default service;
