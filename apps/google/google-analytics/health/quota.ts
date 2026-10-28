/**
 * How much headroom is left on THIS property — Google Analytics.
 *
 * This is the one `google-*` app in the pack that can answer the question with
 * a real number. Its sibling `google-ads` declares quota `unavailable` because
 * Google publishes no headroom for that API; GA4 is different. Verified in the
 * Data API discovery document (fetched 2026-08-18): `RunReportRequest` takes
 * `returnPropertyQuota`, and the response then carries a `propertyQuota` object
 * whose six groups each report `{consumed, remaining}` —
 *
 *   tokensPerDay                  (standard 200,000/day; 360 properties more)
 *   tokensPerHour                 (standard 40,000/hour)
 *   tokensPerProjectPerHour       (35% of the hourly allowance)
 *   concurrentRequests            (standard 10)
 *   serverErrorsPerProjectPerHour (standard 10)
 *   potentiallyThresholdedRequestsPerHour (120)
 *
 * **The probe costs what it measures, and that is stated rather than hidden.**
 * GA4 has no free way to read the quota: `propertyQuota` only rides on a report
 * response, so the check runs the cheapest report there is — one metric, one
 * day, `limit: 1` — and reads the headroom off it. A report that small costs a
 * token or two out of a 200,000/day allowance, and `minIntervalSeconds: 900`
 * caps it at four an hour. Spending a rounding error to know whether the next
 * thousand calls will work is the right trade; spending nothing and reporting
 * `unknown` forever is not.
 *
 * Annotation:
 *
 *   - `kind: "quota"`, `scope: "connection"`, `credential: "signed"` — the
 *     allowance belongs to the property this Connection points at, and reading
 *     it needs the credential on the wire. No `network.allow` is declared,
 *     which the spec requires alongside a signed posture.
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over.
 *
 * `tokensPerDay` drives the state because it is the allowance that actually
 * runs out; the rest are reported for display.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { DATA_API, type GAConnectionDisplay } from "../lib/client.ts";

interface QuotaStatus {
  consumed?: number;
  remaining?: number;
}

/** The six groups GA4 reports, in the order an operator cares about them. */
const GROUPS = [
  "tokensPerDay",
  "tokensPerHour",
  "tokensPerProjectPerHour",
  "concurrentRequests",
  "serverErrorsPerProjectPerHour",
  "potentiallyThresholdedRequestsPerHour",
] as const;

/**
 * Headroom is context, not a verdict — `severity: "informational"` means this
 * state never worsens a roll-up. Reported honestly anyway so a UI can show why
 * a workflow is about to start failing.
 *
 * GA4 reports `remaining` but not the group's ceiling, so the percentage test
 * the other apps in this pack use is not available: `consumed + remaining` is
 * the allowance as of this request, which is the best denominator there is.
 */
const headroom = (q: QuotaStatus | undefined): HealthState => {
  if (!q || typeof q.remaining !== "number") return "unknown";
  if (q.remaining <= 0) return "down";
  const total = (q.consumed ?? 0) + q.remaining;
  if (total > 0 && q.remaining / total < 0.1) return "degraded";
  return "ok";
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Data API token headroom",
  description:
    "Tokens remaining on this property, read off `propertyQuota` from the cheapest possible " +
    "report. The probe spends a token or two of the allowance it measures.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 900,

  async check(_input, ctx) {
    const display = (ctx.connection?.display ?? {}) as GAConnectionDisplay;
    const property = display.propertyId?.replace(/^properties\//, "");
    if (!property) return { state: "unknown", message: "connection records no property" };

    const res = await ctx.fetch(
      `${DATA_API}/properties/${encodeURIComponent(property)}:runReport`,
      {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          // The smallest report GA4 will accept: one metric, one day, one row.
          metrics: [{ name: "activeUsers" }],
          dateRanges: [{ startDate: "yesterday", endDate: "yesterday" }],
          limit: "1",
          returnPropertyQuota: true,
        }),
      },
    );
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const body = await res.json().catch(() => null) as
      | { propertyQuota?: Record<string, QuotaStatus> }
      | null;
    const pq = body?.propertyQuota;
    if (!pq) {
      return { state: "unknown", message: "report carried no propertyQuota" };
    }

    const groups = GROUPS.filter((g) => typeof pq[g]?.remaining === "number");
    if (groups.length === 0) {
      return { state: "unknown", message: "propertyQuota reported no readable group" };
    }

    return {
      state: headroom(pq.tokensPerDay),
      quota: groups.map((g) => ({
        id: g,
        // GA4 reports what is left and what this request used, never the
        // ceiling — so the allowance is reconstructed rather than invented.
        limit: (pq[g].consumed ?? 0) + (pq[g].remaining ?? 0),
        remaining: pq[g].remaining,
        unit: g.startsWith("tokens") ? "tokens" : "requests",
      })),
      ttlSeconds: 300,
    };
  },
};

export default quota;
