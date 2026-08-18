/**
 * Azure DevOps meters in **throughput units**, and you cannot read your balance.
 *
 * ## What the limit actually is
 *
 * Not requests per minute. Azure DevOps assigns each request a cost in
 * *throughput units* — a measure of the work it caused, so a WIQL query across
 * a large project costs far more than fetching one work item — and meters those
 * over a five-minute sliding window, per user and per organization.
 *
 * That is why a workflow can make a hundred cheap calls without noticing and
 * then be throttled by five expensive ones.
 *
 * ## What it sends, and only when it is unhappy
 *
 * When you approach the limit Azure DevOps adds `X-RateLimit-Remaining`,
 * `X-RateLimit-Limit`, `X-RateLimit-Reset` and, once it is delaying you,
 * `Retry-After`. **A response well inside the limit carries none of them** —
 * silence means healthy rather than unknown, which is the opposite of most
 * APIs and makes a poll actively misleading: it would report `unknown` on every
 * healthy run and only produce a number when things were already going wrong.
 *
 * A check would also have to spend throughput units to measure throughput
 * units.
 *
 * So this states the mechanism, and the `429` is surfaced where it can be acted
 * on: with its `Retry-After`, and with the note that the fix is fewer expensive
 * calls rather than a longer wait.
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API throughput headroom",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  severity: "informational",
  unavailable: {
    reason: "Azure DevOps meters THROUGHPUT UNITS rather than requests — each call costs in " +
      "proportion to the work it causes, metered over a five-minute sliding window per user and " +
      "per organization, so a hundred cheap calls can pass unnoticed while five expensive ones " +
      "throttle. Verified 2026-08-18: the `X-RateLimit-Remaining`, `X-RateLimit-Limit` and " +
      "`X-RateLimit-Reset` headers appear only as the limit is approached, and `Retry-After` " +
      "only once requests are being delayed — a response comfortably inside the limit carries " +
      "none of them, so silence means healthy rather than unknown and a poll would report " +
      "`unknown` on every healthy run. Measuring would also spend the units being measured. The " +
      "429 is surfaced on the call that hit it instead, with its `Retry-After`.",
  },
};

export default quota;
