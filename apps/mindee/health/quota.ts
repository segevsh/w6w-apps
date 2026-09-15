import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Mindee publishes no readable rate-limit headroom, so this declares
 * `unavailable` with a reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any
 * other severity a declared absence would pin the app's verdict at `unknown`
 * forever.
 *
 * ## Verified two ways on 2026-09-15
 *
 * 1. **Nothing on the wire.** A live response from `api-v2.mindee.net` — both
 *    a successful `GET /v2/search/models` and a rejected 401 — carried only
 *    `date`, `content-type`, `content-length` and
 *    `strict-transport-security`. No `X-RateLimit-*`, `RateLimit-*`, or any
 *    other quota-shaped header on either.
 * 2. **Nothing in the documentation.** `integrations/technical-limitations.md`
 *    states the ceilings as two fixed numbers — 200 enqueue (POST) requests
 *    per minute and 1,200 polling (GET) requests per minute, per
 *    organization (all models, IPs and API keys combined) — and says
 *    explicitly: "If rate limits are exceeded, the server will return a HTTP
 *    429 error." No remaining-count or reset-time signal is documented
 *    anywhere, so the only readable signal is the 429 refusal itself, which
 *    arrives after the fact.
 *
 * There is also no separate PLAN-consumption endpoint to fall back on (unlike
 * Apify's `/v2/users/me/limits`): Mindee's billing is per-page/per-inference
 * usage tracked on the Platform UI, not exposed as a headroom figure any
 * route in `openapi.json` returns.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request-rate headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Mindee exposes no remaining request count: a live api-v2.mindee.net response carries no " +
      "X-RateLimit-* or RateLimit-* header of any kind (checked on both a successful and a " +
      "rejected request), and integrations/technical-limitations.md documents only fixed " +
      "ceilings — 200 enqueue (POST) requests/minute and 1,200 polling (GET) requests/minute per " +
      "organization — with the 429 refusal itself as the only signal. There is also no separate " +
      "plan-consumption endpoint (e.g. an account-limits route) to report headroom from instead.",
  },
};

export default quota;
