/**
 * How much of the rate limit is left — Loops does not say.
 *
 * Worth declaring rather than leaving as a gap, because Loops clearly *has* a
 * limit: the OpenAPI document defines `429` responses, so exhaustion is a
 * modelled outcome. What it does not define is any way to see the allowance
 * before you hit it. Verified 2026-08-18 against
 * `https://app.loops.so/openapi.json` (v1.21.7):
 *
 *   - **No rate-limit response header is declared anywhere.** Searching the
 *     whole document for `ratelimit`, `rate limit` and `retry-after` returns
 *     nothing — the only hits for the subject at all are the two `429`
 *     status codes themselves.
 *   - **No usage or quota endpoint exists.** The closest is
 *     `GET /v1/api-key`, which returns the team name and nothing else.
 *   - Measured on the wire, a `401` from `app.loops.so` carries no
 *     `X-RateLimit-*`, `RateLimit-*` or `Retry-After` header either.
 *
 * There is also a second, quieter meaning of "how much is left" here — the
 * email sending allowance on the plan — and Loops publishes no API for that
 * one at all.
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict — an
 * account whose headroom simply cannot be read is not a degraded account.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Loops publishes no rate-limit headers, no usage endpoint and no plan-allowance endpoint. " +
      "Verified 2026-08-18 against its own OpenAPI document (v1.21.7): searching for " +
      "`ratelimit`, `rate limit` and `retry-after` returns no header declaration anywhere, and " +
      "the only mentions of the subject are two 429 status codes. GET /v1/api-key returns the " +
      "team name and nothing more. Exhaustion is visible only as a 429 when it happens.",
  },
};

export default quota;
