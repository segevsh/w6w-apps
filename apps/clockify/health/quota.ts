import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declared `unavailable` rather than guessed — a live, unauthenticated probe
 * of `GET /workspaces` (2026-08-01) returned no `X-RateLimit-*`/`RateLimit-*`
 * response headers, and Clockify documents no separate quota-inspection
 * endpoint. `severity: "informational"` so an absent check never worsens a
 * roll-up verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Clockify's API returns no rate-limit response headers and documents no headroom " +
      "endpoint (verified live 2026-08-01); nothing exists to probe ahead of a 429.",
  },
};

export default quota;
