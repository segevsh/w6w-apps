/**
 * How much of the request allowance is left — JumpCloud does not say.
 *
 * Worth stating rather than leaving as a gap, because JumpCloud *does* rate
 * limit and does document retry guidance, so the absence looks like an
 * oversight until you check. Measured 2026-08-18 against
 * `console.jumpcloud.com`:
 *
 *   - **No rate-limit headers on any response observed** — a 401 from a wrong
 *     key or a 302 from a missing one. Neither the `X-RateLimit-*` family nor
 *     `RateLimit-*` nor `Retry-After` appears. (There is no anonymous way to
 *     read a 2xx here: an unknown path with a bad key answers 401, because auth
 *     is checked before routing.)
 *   - **The specs declare none either.** Searching both documents for
 *     `ratelimit` and `retry-after` returns zero hits — not a header, not a
 *     schema, not a mention.
 *   - There is no quota or usage endpoint. `GET /organizations/{id}` returns
 *     settings and a seat count, not an API allowance.
 *
 * Exhaustion surfaces as a `429`, which the client raises with JumpCloud's
 * `{"error","message"}` envelope intact. That is the whole of what this API
 * offers on the subject, so nothing is invented here.
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
      "JumpCloud publishes no rate-limit headers and no usage endpoint. Measured 2026-08-18, " +
      "responses from console.jumpcloud.com carry no X-RateLimit-*, RateLimit-* or Retry-After " +
      "header, and searching both the V1 and V2 OpenAPI documents for those names returns zero " +
      "hits. Exhaustion is only visible as a 429 at the moment it happens.",
  },
};

export default quota;
