/**
 * How much headroom is left on THIS credential — Excel via SharePoint Online.
 *
 * This is the one place where Excel differs materially from the sibling
 * `outlook` App, which declares its quota check absent. Exchange Online
 * genuinely publishes nothing; SharePoint Online — which is what actually hosts
 * the workbook and meters every `/me/drive/...` call — publishes the IETF
 * `RateLimit-*` headers, and does so **on successful responses**:
 *
 *     HTTP/1.1 200 Ok
 *     RateLimit-Limit: 1200
 *     RateLimit-Remaining: 120
 *     RateLimit-Reset: 5
 *
 * https://learn.microsoft.com/en-us/sharepoint/dev/general-development/how-to-avoid-getting-throttled-or-blocked-in-sharepoint-online
 *
 * Two properties of that surface shape the logic below, and both are the
 * vendor's own words rather than an inference:
 *
 *   1. **The headers are emitted only past 80% consumption.** The documented
 *      condition for the one supported policy (the app 1-minute resource-unit
 *      limit) is "Usage >= 80% of the limit". So their *absence* is not
 *      `unknown` — it is the service saying the app is below four-fifths of its
 *      minute budget. Reporting `unknown` there would be strictly less
 *      informative than the truth.
 *   2. **They are best-efforts, and incomplete.** Microsoft says applications
 *      "may not receive the headers under all conditions", and that "there are
 *      other limits that aren't presented in the RateLimit headers, so
 *      applications can get throttled even before reaching the limit described
 *      in the RateLimit headers". In particular the Excel service's own ceilings
 *      — 5,000 requests / 10 s per app across all tenants, 1,500 requests / 10 s
 *      per app per tenant — are a *separate* budget these headers say nothing
 *      about. So an `ok` here is "not near the SharePoint minute limit", never
 *      "you will not be throttled".
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived `auth:*`
 *     check answers "is the credential live"; this answers "will the next
 *     hundred calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's defaults
 *     and both are correct: the allowance belongs to the credential, and reading
 *     it needs the credential on the wire. Signing is safe because the probe
 *     stays on the app's own egress allowlist — this check declares no
 *     `network.allow` of its own, which the spec forbids alongside a signed
 *     posture.
 *   - `severity: "informational"` — running low is worth showing and never worth
 *     failing a verdict over. It is doubly right here, where the signal is
 *     explicitly best-efforts.
 *
 * Probe: `GET /me/drive`, the cheapest Files call there is (1 resource unit, a
 * single-item query) and the narrowest one any credential that can reach a
 * workbook can also make. It is deliberately a drive call rather than a workbook
 * call, because a health check must not need to be told which workbook to poke.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** SharePoint's reset header is *relative* seconds until the quota refills. */
const isoFromDelta = (v: string | null, now: number): string | undefined => {
  const n = num(v);
  return n === undefined ? undefined : new Date(now + n * 1000).toISOString();
};

/**
 * Headroom is context, not a verdict — `severity: "informational"` means this
 * state never worsens a roll-up. It is reported honestly anyway so a UI can show
 * why a workflow is about to start getting 429s.
 */
const headroom = (remaining: number, limit?: number): HealthState => {
  if (remaining <= 0) return "down";
  if (limit !== undefined && limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  description:
    "Resource units remaining in the current SharePoint Online one-minute window, read off the IETF `RateLimit-*` headers. Those headers appear only once the app passes 80% of that limit, so their absence is itself the healthy answer.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/me/drive`);
    if (!res.ok) {
      // 429 is the one failure that still answers the question being asked.
      if (res.status === 429) {
        const retry = num(res.headers.get("retry-after"));
        return {
          state: "down",
          message: retry === undefined
            ? "throttled by SharePoint Online (429)"
            : `throttled by SharePoint Online (429); retry after ${retry}s`,
          ttlSeconds: 60,
        };
      }
      return { state: "unknown", message: `quota probe returned ${res.status}` };
    }

    const limit = num(res.headers.get("ratelimit-limit"));
    const remaining = num(res.headers.get("ratelimit-remaining"));

    // Documented emission condition: usage >= 80% of the one-minute limit. No
    // headers therefore means "below that threshold", not "cannot tell".
    if (remaining === undefined) {
      return {
        state: "ok",
        message:
          "no RateLimit-* headers — SharePoint Online emits them only past 80% of the one-minute resource-unit limit",
        ttlSeconds: 60,
      };
    }

    return {
      state: headroom(remaining, limit),
      message:
        "past 80% of the SharePoint Online one-minute resource-unit limit; the separate Excel service limits (1,500 requests / 10s per app per tenant) are not covered by these headers",
      quota: [{
        id: "resource-units",
        limit,
        remaining,
        resetAt: isoFromDelta(res.headers.get("ratelimit-reset"), Date.now()),
        unit: "resource units",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
