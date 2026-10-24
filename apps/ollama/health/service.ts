import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Ollama has no vendor service to be up or down, so there is no status page to
 * read — and none is invented here.
 *
 * Ollama is software the user runs on their own machine; this app talks to that
 * machine and to nothing else. The registry at ollama.com matters only to
 * `model-pull`, and nothing in the API reports on it. The question this slot
 * would answer ("is the server up?") is the `instance` check, per connection.
 *
 * `informational` keeps this declared absence from pinning the app's verdict at
 * `unknown`.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Ollama platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Ollama is self-hosted software and publishes no status page for a server you run. " +
      "Whether YOUR server is up is the per-connection `instance` check (GET /api/version).",
  },
};

export default service;
