import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Mixmax limits requests to 120 per 60 seconds (per IP address and user) and sends
 * `X-RateLimit-*` headers on every response, but only on calls a workflow makes itself: there is
 * no usage or plan endpoint to read headroom from, and a probe would spend the quota it measures.
 * A declared absence; `informational` keeps the permanent `unknown` from pinning the app.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Mixmax allows 120 requests per 60 seconds per IP address and user and reports it only in " +
      "X-RateLimit-* headers on ordinary responses (429 + Retry-After on breach); it exposes no " +
      "usage or plan endpoint, so headroom cannot be read without spending it.",
  },
};

export default quota;
