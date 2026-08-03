import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Circle meters the Admin API twice over, and publishes no way to read either
 * remainder — so this declares `unavailable` with a reason rather than
 * pretending to probe.
 *
 * ## The budgets are real, and unusually consequential
 *
 * Unlike most vendors' single rate limit, Circle enforces two independent
 * things (`/apis/admin-api/usage-and-limits`, fetched 2026-08-03):
 *
 *  1. **A monthly request allowance, by plan.** "Business — 5,000
 *     requests/month. Enterprise and Circle Plus — 30,000 requests/month.
 *     Circle Plus Platform — 250,000 requests/month." This is the one that
 *     actually bites: 5,000/month is roughly 7 requests an hour.
 *  2. **A rate limit.** "The limit is **2000 request per 5 minutes per IP. That
 *     number can change at any time.**"
 *
 * And the allowance counts failures. Circle lists the response codes that spend
 * it: 200, 201, 204, **400, 401, 403, 404, 405, 422, 429**. Only 5xx is free.
 * So a misconfigured workflow burns the same budget as a working one — which is
 * precisely why an operator would want a headroom reading here.
 *
 * ## Why there is nothing to read
 *
 * Checked three ways on 2026-08-03, rather than assumed:
 *
 *  1. **No usage endpoint exists in v2.** The Admin API v2 OpenAPI document
 *     (`https://api-headless.circle.so/api/admin/v2/swagger.yaml`, 553,625
 *     bytes, 71 paths) contains no path matching `usage`, `limit` or `quota`,
 *     and declares no rate-limit response header anywhere in the document.
 *  2. **The vendor points at the dashboard, not at an API.** "You can monitor
 *     your usage by going to the **Developers** tab in your admin area", and
 *     again: "The 'Endpoints overview' section in your Developer dashboard
 *     shows you an overview of your requests broken up by endpoint." Both
 *     sentences describe a web page. Neither describes an endpoint.
 *  3. **The live response headers carry none.** `GET
 *     https://app.circle.so/api/admin/v2/community` returned `date`,
 *     `content-type`, `content-length`, `server`, `x-frame-options`,
 *     `cache-control`, `content-security-policy`, `x-request-id`, `x-runtime`,
 *     `strict-transport-security`, `cf-cache-status`, `set-cookie`, `cf-ray`,
 *     `alt-svc` — and no `RateLimit-*`, `X-RateLimit-*` or `Retry-After` among
 *     them. *Stated precisely: this was observed on the 401 path, since this
 *     App holds no Circle token. It is evidence that the allowance headers are
 *     not emitted by the edge or by the auth middleware, not proof about a 200.
 *     Combined with (1) and (2) — a spec that declares no such header and docs
 *     that route the question to a dashboard — the conclusion is that no
 *     readable remainder is published.*
 *
 * Even the counter Circle does keep is unreadable in time to be useful: "API
 * usage counts are not updated in real-time… We cache the usage count for one
 * minute on our side, so you can expect the count to be updated ~5min after
 * performing that call."
 *
 * A self-counting probe was considered and rejected. The monthly allowance is
 * *per community*, shared by every integration holding a token for it — Zapier
 * excepted, which Circle explicitly exempts. Counting this App's own calls
 * would report a number that is right only for a community using nothing else,
 * and the error is silent and always optimistic. That is worse than saying
 * nothing.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry reports
 * `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity this declared absence would pin the App at `unknown` forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Circle meters the Admin API on a monthly plan allowance (5,000 requests on Business, " +
      "30,000 on Enterprise/Circle Plus, 250,000 on Circle Plus Platform) plus a 2,000-per-5-" +
      "minutes-per-IP rate limit, and counts 4xx responses against the allowance. Neither " +
      "remainder is readable: the v2 OpenAPI document declares no usage endpoint and no " +
      "rate-limit response header, live responses carry none, and Circle's own docs direct you " +
      "to the Developers tab in the admin web UI — where the number is itself ~5 minutes stale.",
  },
};

export default quota;
