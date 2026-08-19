import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Rate-limit headroom — declared **unavailable**, and not for the usual
 * reason.
 *
 * Almost every declared absence in this pack says *the vendor publishes
 * nothing*. Terraform publishes precise headers on every response:
 *
 *     x-ratelimit-limit: 30
 *     x-ratelimit-remaining: 29
 *     x-ratelimit-reset: 1.0
 *
 * The problem is what they describe. Thirty requests **per second**, refilling
 * in one. `remaining` is not headroom against a budget — it is how much of the
 * current second is left, and by the time a health result is stored the window
 * it measured is over. A check reporting "29 of 30 remaining" would be
 * accurate, meaningless, and reassuring, which is the worst combination.
 *
 * Two further consequences worth stating, because they are what a reader of
 * this file is likely to be looking for:
 *
 * - **`x-ratelimit-reset` is a fractional number of seconds, not a Unix
 *   timestamp.** The reflex `new Date(reset * 1000)` gives 1 January 1970.
 * - **Exhausting it is a fan-out problem, not a quota problem.** A 429 here
 *   means too many requests were made in the same second — a loop paging
 *   through workspaces without a pause, typically — and the fix is
 *   sequencing, not a bigger plan. Waiting one second clears it.
 *
 * There is a real budget worth watching in HCP Terraform, but it is not
 * requests: it is **managed resources**, which is what the plan is priced on.
 * That figure is per-organisation and lives on the organisation's
 * subscription, not on any rate-limit header, and reading it needs a token
 * kind most automations do not hold.
 */
const check: HealthCheckDefinition = {
  key: "quota",
  kind: "quota",
  scope: "connection",
  credential: "none",
  title: "Rate-limit headroom",
  description:
    "Not checkable in a useful sense. The headers exist and precise — 30 requests per SECOND, " +
    "resetting in one — so a point sample measures a window that is over before the result is " +
    "stored. A 429 here is a fan-out problem, cleared by waiting a second.",
  covers: ["quota"],
  severity: "informational",
  unavailable: {
    reason: "HCP Terraform's limit is 30 requests per second with a one-second window, so " +
      "`x-ratelimit-remaining` describes the current second rather than any budget. Sampling it " +
      "would produce a number that is accurate, meaningless and reassuring. (It is also " +
      "SECONDS, fractional — `x-ratelimit-reset: 1.0` — not a Unix timestamp.) The budget that " +
      "does matter is managed RESOURCE count against the subscription, which is not exposed as " +
      "a quota header on any response.",
  },
};

export default check;
