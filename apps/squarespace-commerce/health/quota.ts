/**
 * How much request headroom is left? — declared **absent**, not guessed.
 *
 * Squarespace documents its limits in prose and publishes nothing readable on
 * the wire. Verified 2026-09-22 against
 * `developers.squarespace.com/commerce-apis/rate-limits`: "Squarespace Commerce
 * APIs employ a rate limit of 300 requests per minute, an equivalent bandwidth
 * of five requests per second. Requests over the rate limit receive a 429 Too
 * Many Requests response with a cool down period of one minute. In addition, the
 * Create Order endpoint has a separate, stricter rate limit of 100 requests per
 * hour, per website when an API Key is used for authentication."
 *
 * That is the whole story the vendor tells: fixed numeric ceilings, a `429` when
 * they are crossed, and **no rate-limit response headers at all** — no
 * `X-RateLimit-Limit`, no remaining count, no reset time — and no balance or
 * usage endpoint anywhere in the Commerce surface. A "quota" check here could
 * only spend a real signed call and then infer headroom from whether it happened
 * to succeed, which is a guess dressed as a probe, so the honest answer is
 * `unavailable` per `rfcs/healthcheck.md`'s "Declaring absence".
 *
 * The two ceilings are still documented where a reader needs them: `lib/client.ts`
 * names both constants, the Create order action and README repeat the 100/hour
 * key limit, and the client's own error formatter says which limit applies when
 * it surfaces a `429`.
 *
 * `severity: "informational"` is required, not stylistic: an `unavailable` entry
 * always reports `unknown`, and `unknown` outranks `ok` in a roll-up — at any
 * other severity, declaring this absence would pin the app's verdict at
 * `unknown` permanently.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Request-rate headroom",
  description:
    "Not readable: Squarespace documents fixed ceilings (300 requests/minute, and 100/hour on " +
    "Create order with an API key) but publishes no rate-limit response headers and no " +
    "balance or usage endpoint.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Squarespace's rate-limits page states the limits in prose only — 300 requests/minute " +
      "generally and 100 requests/hour per website for Create order with an API key — and the " +
      "vendor returns no rate-limit headers on any response (verified 2026-09-22) and publishes " +
      "no quota/balance endpoint in the Commerce surface. Headroom could only be inferred from " +
      "whether a signed call happened to succeed, which is a guess rather than a probe.",
  },
};

export default quota;
