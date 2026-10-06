import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declares that no quota/rate-limit headroom signal exists — a positive fact.
 *
 * The API reference documents per-function request limits (e.g. 5 requests per
 * second for getLists, 10 per minute for deleteList) and a 429 status past
 * them, but no remaining-request header or usage endpoint; an unauthenticated
 * 401 carries no `X-RateLimit-*` header (measured 2026-10-06). That is a
 * documentation read plus an unsigned response, not a measurement of a signed one.
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
    reason: "Acumbamail documents per-function request limits and a 429 response, but no " +
      "remaining-request header or usage endpoint to read headroom from.",
  },
};

export default quota;
