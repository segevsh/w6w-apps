import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate limit and balance",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "thanks.io exposes no balance or usage endpoint. Responses carry only an " +
      "`x-ratelimit-limit` / `x-ratelimit-remaining` pair (120 per minute measured 2026-10-06), " +
      "and an account whose payments fail is refused with HTTP 402 rather than reported ahead " +
      "of time.",
  },
};

export default quota;
