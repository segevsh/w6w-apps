import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Relevance AI publishes no readable headroom on the API surface this app
 * covers, so this declares `unavailable` with a reason rather than pretending to
 * probe one.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity this declared absence would pin the app's verdict at `unknown`
 * forever.
 *
 * ## Verified three ways on 2026-09-22
 *
 * 1. **Nothing on the wire.** Responses from
 *    `api-f1db6c.stack.tryrelevance.com` carried `content-length`, `date`,
 *    `vary`, `access-control-*`, the policy headers (`cross-origin-*`,
 *    `x-frame-options`, `strict-transport-security`, …) and `x-trace-id` /
 *    `x-request-id` / `error_id` on errors — and **no** `X-RateLimit-Limit`,
 *    `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `RateLimit-*` or
 *    `Retry-After`, on `GET /auth/info`, `GET /studios/list`,
 *    `GET /agents/conversations/list`, `POST /agents/list` and
 *    `POST /studios/{id}/trigger` alike.
 * 2. **Nothing in the covered surface.** Read off the vendor's live 527-path
 *    schema, the only object that pairs a ceiling with consumption is
 *    `GetOrganizationUsageOutput` = `{usage, limit}`, behind
 *    `GET /organizations/{organization_id}/usage/get`. That is organization
 *    management — this app deliberately does not cover it, and the vendor's own
 *    documentation says why: "the Relevance AI API is officially supported only
 *    for triggering Agents and Tools. All other usage is currently unsupported."
 *    Credits do surface on the supported surface, but only *after* the fact and
 *    only per run: `TriggerStudioOutput.credits_used` and `.cost` describe one
 *    job, never the account's balance. `GET /studios/list/usage` (which the
 *    schema also exposes) answers `ListStudioUsageAggregationOutput` =
 *    `{results: [...]}` — per-tool aggregates with no limit and no balance
 *    attached.
 * 3. **No substitute probe is honest.** Hitting the limiter until it answers 429
 *    would spend the quota it is measuring, on the endpoints whose whole purpose
 *    is to run the user's work.
 *
 * The ceilings that do exist are per-organization plan credits (the vendor
 * documents credit-based billing and usage alarms under `/organizations/*`), so
 * a workflow that needs headroom has to read the Relevance AI billing UI for
 * now — which is what `unavailable.reason` is for.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Plan and rate-limit headroom",
  description:
    "Declared absence: no supported Relevance AI endpoint reports remaining credits or a rate-limit " +
    "budget, and the one object in the vendor's schema that pairs usage with a limit lives in its " +
    "unsupported organization-management surface.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "No supported Relevance AI endpoint reports a remaining budget. Nothing on the agent/tool " +
      "surface returns an X-RateLimit-*, RateLimit-* or Retry-After header (measured 2026-09-22 on " +
      "GET /auth/info, GET /studios/list, GET /agents/conversations/list, POST /agents/list and " +
      "POST /studios/{id}/trigger), and the only usage-plus-limit object in the vendor's whole " +
      "527-path schema — GetOrganizationUsageOutput = {usage, limit} — sits behind " +
      "GET /organizations/{organization_id}/usage/get, in the organization-management family the " +
      "vendor itself marks unsupported and which this app deliberately does not cover. Credits are " +
      "reported per run instead (TriggerStudioOutput.credits_used and .cost), never as an account " +
      "balance, and spending requests to discover the ceiling is not a health check.",
  },
};

export default quota;
