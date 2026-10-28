/**
 * How much headroom is left — BigQuery publishes cost, not balance.
 *
 * Worth checking rather than assuming, because BigQuery is metered more
 * visibly than most APIs and it is tempting to think the number is readable:
 *
 *   - **What it does report is spend, per query.** Every query response carries
 *     `totalBytesProcessed`, and a dry run
 *     (`query-run` with Dry Run on) returns that estimate **without running the
 *     query or being billed**. That is genuinely useful — it is how a workflow
 *     avoids a surprise — but it is the price of one query, not the allowance
 *     left.
 *   - **What it does not report is remaining quota.** The discovery document
 *     declares no rate-limit or quota response headers and no headroom
 *     endpoint. BigQuery's limits — concurrent interactive queries, daily query
 *     bytes per project, load jobs per day, streaming insert rates — live in
 *     Cloud's quota system, are visible in the Cloud console and the Service
 *     Usage API, and are not part of this API's surface at all.
 *   - Exhaustion surfaces as a `403` whose `reason` is `quotaExceeded` or
 *     `rateLimitExceeded`, which the client already raises with Google's
 *     envelope intact.
 *
 * Reading the real number would mean calling a *different* Google API
 * (Service Usage) with a *different* scope, which would widen what every
 * Connection has to grant for a report nobody asked for. So this is declared
 * rather than invented, and `query-run`'s dry-run flag is where the cost
 * question is actually answered.
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Query quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "BigQuery's discovery document declares no rate-limit or quota response headers and no " +
      "headroom endpoint (verified 2026-08-18). Its limits live in Google Cloud's quota " +
      "system, readable only through the separate Service Usage API and a broader scope than " +
      "this app requests. Per-query cost IS knowable — `totalBytesProcessed`, and a dry run " +
      "returns it without being billed — but that is spend, not remaining allowance. " +
      "Exhaustion surfaces as a 403 with reason `quotaExceeded` or `rateLimitExceeded`.",
  },
};

export default quota;
