import type { HealthCheckDefinition } from "@w6w/types";

export default {
  key: "service",
  title: "DICE service status",
  kind: "service",
  severity: "informational",
  unavailable: {
    reason:
      "No official machine-readable partner API status feed was found. status.dice.fm does not resolve; dice.statuspage.io serves an unrelated HTML shell. Use the API reachability and token checks.",
  },
} satisfies HealthCheckDefinition;
