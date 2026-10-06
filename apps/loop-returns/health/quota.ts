import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Loop enforces 300 requests per minute per API key and answers 429 beyond it. " +
      "Responses carry x-ratelimit-limit / x-ratelimit-remaining, but those are per-window " +
      "counters on a probe that would itself spend a request; no usage endpoint exists, so " +
      "headroom is declared unavailable rather than polled.",
  },
};

export default quota;
