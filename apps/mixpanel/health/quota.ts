/**
 * Nothing to read — and the limit is low enough that saying so matters.
 *
 * Mixpanel's Query API allows **60 queries an hour and 5 concurrent**, per
 * project rather than per credential. That is an unusually tight budget for an
 * automation to share with a company's dashboards and BI tools, and it is the
 * single most important operational fact about this app.
 *
 * It is also invisible. Measured 2026-08-18 against `mixpanel.com/api/query/*`:
 * a response carries `x-server-elapsed` and nothing resembling `x-ratelimit-*`.
 * Exceeding the limit answers a bare **`429`** and that is the whole signal —
 * there is no header, no usage endpoint on the Query API, and no documented
 * counter to read.
 *
 * Probing for headroom would mean spending one of the sixty to find out how
 * many are left, which is self-defeating. So this app ships an explicit absence
 * with the numbers attached rather than a check that costs what it measures.
 *
 * The client turns the `429` into a message that states the limit, which is the
 * next best thing: the first time a workflow hits it, the error says why.
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Query allowance",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Mixpanel exposes no query allowance to a client. Verified 2026-08-18: responses from " +
      "mixpanel.com/api/query carry x-server-elapsed and no x-ratelimit-* header of any kind, " +
      "and neither the Query API nor the app API publishes a usage or counter endpoint. The " +
      "documented limits are 60 queries per hour and 5 concurrent for the QUERY API (per " +
      "project, shared with dashboards and BI tools), 60 per hour plus 3 per second and 100 " +
      "concurrent for the raw Export API, and 2GB of uncompressed JSON per minute for " +
      "ingestion — three different budgets, none of them reported. Measuring headroom would " +
      "mean spending one of the sixty to discover how many remain, so this app reports the 429 " +
      "with the limit named instead.",
  },
};

export default quota;
