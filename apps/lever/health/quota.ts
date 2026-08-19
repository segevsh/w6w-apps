import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Rate-limit headroom — declared **unavailable**, and the reason is the useful
 * part.
 *
 * ## Lever rate-limits and publishes nothing to measure it with
 *
 * Its documentation names a 429 and says "Lever imposes a limit of the number
 * of requests a client can make in a short time", with no header reporting the
 * budget, the window or what is left. Its own advice for a 503 is exponential
 * backoff, and the same is the only strategy available for a 429.
 *
 * So there is nothing a check could read, and a probe would spend a request
 * from an invisible budget to learn nothing.
 *
 * ## The limit that actually shapes a Lever integration is the cursor
 *
 * Pagination is 100 records at a time behind an **opaque token**: there is no
 * way to jump, no way to parallelise, and no way to resume from a computed
 * position. Walking a pipeline of ten thousand candidates is a hundred
 * sequential requests whatever the rate limit says, and that serialisation —
 * not a quota — is what makes a full export slow.
 *
 * `opportunity-list` returns the cursor for that reason.
 */
const check: HealthCheckDefinition = {
  key: "quota",
  kind: "quota",
  scope: "connection",
  credential: "none",
  title: "Rate-limit headroom",
  description:
    "Declared unavailable — Lever rate-limits and publishes no header for the budget, the " +
    "window or what is left, so exponential backoff is the only strategy. What actually shapes " +
    "an integration is the OPAQUE PAGINATION CURSOR, which cannot be parallelised.",
  covers: ["quota"],
  severity: "informational",
  unavailable: {
    reason:
      "Lever publishes no rate-limit headers. Its documentation names a 429 — 'Lever imposes a " +
      "limit of the number of requests a client can make in a short time' — without stating the " +
      "budget or the window, and reports nothing on a successful response either, so there is " +
      "nothing to measure and a probe would spend a request to learn that. The constraint that " +
      "does shape an integration is pagination: 100 records at a time behind an opaque cursor " +
      "that only Lever can produce, so a full pipeline export is inherently sequential no " +
      "matter what the rate limit allows. `opportunity-list` returns that cursor.",
  },
};

export default check;
