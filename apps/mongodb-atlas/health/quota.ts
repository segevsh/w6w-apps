import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Rate-limit headroom — declared **unavailable**.
 *
 * MongoDB documents the Administration API's limit — 100 requests per minute
 * per project — and publishes **no header** describing it. Probed live on
 * 2026-08-19, a response carries no `x-ratelimit-*`, no `ratelimit`, and no
 * `retry-after` until a 429 actually happens. There is nothing to sample.
 *
 * Two things a reader looking for this is probably about to need:
 *
 * - **The limit is per project, not per token.** A workflow fanning out across
 *   several projects has a separate budget in each, and one that loops over
 *   clusters within a single project shares one.
 * - **The limit is not the constraint that usually bites.** Atlas refuses a
 *   change while a cluster is not `IDLE`, and cluster changes take minutes —
 *   so a workflow fast enough to hit 100 requests per minute against one
 *   project has almost certainly already hit a 409 from
 *   `cluster-update`.
 *
 * The budget worth watching in Atlas is cost, not calls, and it is not exposed
 * as a quota anywhere in this API — the billing endpoints report invoices
 * after the fact, at organisation scope, which is a different question from
 * headroom.
 */
const check: HealthCheckDefinition = {
  key: "quota",
  kind: "quota",
  scope: "connection",
  credential: "none",
  title: "Rate-limit headroom",
  description:
    "Not checkable. Atlas documents 100 requests per minute PER PROJECT and publishes no " +
    "rate-limit header at all, so there is nothing to sample — and the constraint that actually " +
    "bites is a cluster refusing changes while it is not IDLE.",
  covers: ["quota"],
  severity: "informational",
  unavailable: {
    reason:
      "The Atlas Administration API's documented limit is 100 requests per minute per PROJECT, " +
      "and no response carries a rate-limit header — verified live on 2026-08-19: no " +
      "`x-ratelimit-*`, no `ratelimit`, and no `retry-after` before a 429. There is no value to " +
      "read. The limit is also rarely the binding constraint: a cluster refuses changes while " +
      "it is not IDLE, and that takes minutes, so a 409 arrives long before a 429. Atlas's real " +
      "budget is cost, which the billing endpoints report after the fact rather than as headroom.",
  },
};

export default check;
