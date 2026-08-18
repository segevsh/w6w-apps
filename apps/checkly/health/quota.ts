/**
 * How much of the plan is left — Checkly publishes the allowance, never the
 * consumption.
 *
 * This one is worth declaring carefully, because the API looks like it answers
 * the question and does not. Verified 2026-08-18 against
 * `https://api.checklyhq.com/openapi.json`:
 *
 *   - **`GET /v1/accounts/me/entitlements` reports entitlements, not usage.**
 *     Each row is `{key, name, description, type, enabled, quantity}`, where
 *     `type` is `flag` or `metered` and `quantity` is documented as *"Maximum
 *     allowed quantity"*. There is no `usage`, no `consumed`, no `remaining` —
 *     searching the whole document for those names finds none of them on any
 *     schema. So it answers "what may this plan do", which is a different
 *     question from "how much is left".
 *   - **No rate-limit headers are declared anywhere.** Searching for
 *     `ratelimit` and `x-ratelimit` returns zero hits.
 *   - **`GET /v1/reporting` is not a usage endpoint either** — it aggregates
 *     check results over a window, which is monitoring data about the things
 *     Checkly watches, not about the account's own consumption.
 *
 * Reporting an entitlement's `quantity` as headroom would be the tempting
 * mistake: it would show a full allowance forever, whatever had been spent.
 * `plan-entitlements` is available as an ordinary read for whoever wants the
 * allowance; this check declines to dress it up as a balance.
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Plan headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Checkly publishes a plan allowance but never its consumption. Verified 2026-08-18: " +
      "GET /v1/accounts/me/entitlements returns rows of {key, name, type, enabled, quantity} " +
      "where quantity is the MAXIMUM allowed, with no usage, consumed or remaining field on any " +
      "schema in the document; no rate-limit header is declared anywhere; and /v1/reporting " +
      "aggregates check results rather than account usage. Reading quantity as headroom would " +
      "report a full allowance forever.",
  },
};

export default quota;
