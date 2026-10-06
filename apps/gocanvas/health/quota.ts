import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason:
      "GoCanvas documents RateLimit-Limit / RateLimit-Remaining / RateLimit-Reset only on a 429 " +
      "response (v3 reference, 'Rate Limits', read 2026-10-06) and states no numeric limit; a " +
      "live 401 carried no ratelimit header. There is no response on which to read headroom, " +
      "so it is declared rather than guessed.",
  },
};

export default quota;
