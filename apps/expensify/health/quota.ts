import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declares that no quota/rate-limit headroom signal exists — a positive fact.
 *
 * The reference documents a fixed limit (5 requests per 10 seconds, 20 per 60 seconds) and a 429
 * past it, but no remaining-request header or usage endpoint. A response from the endpoint
 * measured 2026-10-06 carried no `X-RateLimit-*` or `Retry-After` header (an unsigned
 * response, so a documentation read plus that measurement, not a signed one).
 *
 * `severity: "informational"`: otherwise the permanent `unknown` pins the app.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request headroom",
  kind: "quota",
  severity: "informational",
  covers: ["*"],
  unavailable: {
    reason:
      "Expensify documents a fixed limit (5 requests per 10 seconds, 20 per 60 seconds) and a 429 past it, but exposes no remaining-request header or usage endpoint to read headroom from.",
  },
};

export default quota;
