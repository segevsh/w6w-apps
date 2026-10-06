import type { HealthCheckDefinition } from "@w6w/types";

/**
 * WakaTime documents one limit — fewer than 10 requests per second on average over any 5 minute
 * period, breached with a 429 (or sometimes a 302 that times out) — and no rate-limit headers or
 * usage endpoint (the reference was grepped for `ratelimit`, `retry-after` and `X-Rate`: no
 * hits). "How much is left" cannot be read, so this is a declared absence; `informational`
 * keeps the permanent `unknown` from pinning the app's verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "WakaTime documents a fixed limit of under 10 requests per second averaged over 5 " +
      "minutes and signals a breach only with a 429 or 302; it publishes no rate-limit headers " +
      "or usage endpoint, so headroom cannot be read.",
  },
};

export default quota;
