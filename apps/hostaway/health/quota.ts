/**
 * How much API quota is left? — declared absent, not guessed.
 *
 * Hostaway publishes its limits as prose in the docs' "Rate limits" section and exposes
 * headroom only reactively, which makes a polling quota check impossible:
 *
 *   - There is no quota/usage/limits endpoint anywhere in the documentation — the rate
 *     limits are fixed per-endpoint counters (30/minute for
 *     `POST /v1/conversations/{id}/messages`, 400/10s for
 *     `POST /v1/listings/{id}/calendar/priceDetails`, 200/10s for
 *     `POST /v1/reservations`, 200/10s for all other endpoints per account, and 200/10s
 *     per IP address for all other endpoints), measured over a sliding window.
 *   - The `X-RateLimit-Limit` / `X-RateLimit-Remaining` / `X-RateLimit-Retry-After` /
 *     `X-RateLimit-Applied` headers exist, but the docs state plainly that they "appear
 *     on 429 responses only". There is therefore nothing to read UNTIL the limit is
 *     already hit — which is why `health/api.ts` reports a quota reading when a 429
 *     carries one, instead of this check inventing one.
 *
 * `unavailable` is the honest answer per this pack's convention (`rfcs/healthcheck.md`,
 * "Declaring absence") — a positive statement of the fact rather than a silent gap.
 * `severity: "informational"` so this entry never pins the App's roll-up verdict at
 * `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  description:
    "Not exposed in advance: Hostaway documents fixed per-endpoint windows and states its " +
    "X-RateLimit-* headers appear on 429 responses only, so headroom can only be read after a " +
    "limit is hit (health/api.ts reports it there).",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Hostaway documents no quota/usage endpoint, and its X-RateLimit-Limit, " +
      "X-RateLimit-Remaining, X-RateLimit-Retry-After and X-RateLimit-Applied headers " +
      "'appear on 429 responses only' per the docs' Rate limits section - so headroom cannot " +
      "be read before the limit is reached. The documented limits are fixed windows: 30/minute " +
      "for Send conversation message, 400/10s for the calendar price-details endpoint, " +
      "200/10s for Create a reservation, 200/10s per account and per IP for everything else.",
  },
};

export default quota;
