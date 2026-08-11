import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Fillout's **plan** allowance — submissions per month, seats, form count — is
 * not readable through the API, so this declares `unavailable` with a reason
 * rather than pretending to probe it.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any
 * other severity a declared absence would pin this app's verdict at `unknown`
 * forever.
 *
 * ## Why this is separate from `health/request-rate.ts`
 *
 * Fillout meters two independent things and only one is readable. Request rate
 * *is* readable — the `ratelimit-*` headers are on every response — and the
 * `request-rate` check probes it. Plan consumption is not, and collapsing the
 * two would let a healthy rate reading imply something about monthly headroom
 * that Fillout never said. They are also the two failures with opposite fixes:
 * one is "slow down", the other is "upgrade".
 *
 * ## Verified two ways on 2026-08-11
 *
 * 1. **Nothing in the surface.** The API is eight endpoints and no more — get
 *    forms, get form metadata, get all submissions, get submission by id,
 *    delete submission by id, create a webhook, remove a webhook, create
 *    submissions (enumerated from the reference index at
 *    `fillout.com/help/llms.txt` and confirmed against the navigation of
 *    `fillout.com/help/fillout-rest-api`). None of them is an account, usage,
 *    plan, billing or whoami read. There is no object in this API that has a
 *    quota on it.
 * 2. **Nothing on the wire.** The only metering headers any response carries
 *    are the request-rate set (`ratelimit-limit`, `ratelimit-policy`,
 *    `ratelimit-remaining`, `ratelimit-reset`, plus `retry-after` on a 429).
 *    No monthly counter, no allowance, no reset date.
 *
 * The nearest usable substitute is `totalResponses` from Get Submissions,
 * which counts one form's responses matching one filter — not the account's
 * consumption, and not comparable to any ceiling the API exposes. Reporting it
 * as headroom would be inventing a number, so it is not reported.
 */
const plan: HealthCheckDefinition = {
  key: "plan",
  title: "Plan allowance headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Fillout's REST API exposes no account, usage, plan or billing endpoint — its whole " +
      "documented surface is eight form/submission/webhook endpoints — and no response carries " +
      "a monthly counter. Only the per-second request rate is metered readably, and the " +
      "`request-rate` check reports that. Monthly submission allowance can only be seen in the " +
      "Fillout dashboard.",
  },
};

export default plan;
