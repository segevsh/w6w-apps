/**
 * How much headroom is left on THIS credential — Meta Graph + Marketing API.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived `auth:*`
 *     check answers "is the credential live"; this answers "will the next
 *     thousand events be accepted".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's defaults
 *     and both are correct: the allowance belongs to the credential, and reading
 *     it needs the credential on the wire. Signing is safe because the probe
 *     stays on the app's own egress allowlist — this check declares no
 *     `network.allow` of its own, which the spec forbids alongside a signed
 *     posture.
 *   - `severity: "informational"` — running low is worth showing and never worth
 *     failing a verdict over.
 *
 * Probe: `GET /me?fields=id`, the cheapest call any Meta token can make. A
 * dataset-scoped Conversions API token from Events Manager carries no
 * permissions at all, so probing the dataset node instead would report a
 * perfectly healthy connection as broken. Same reasoning as the auth `test`
 * hooks.
 *
 * TWO meters, unlike the sibling `facebook` apps, because Conversions API calls
 * are counted as Marketing API calls and Meta meters those separately:
 *
 *   - `X-App-Usage` — platform rate limits, app-wide.
 *     `{"call_count":28,"total_time":25,"total_cputime":25}`
 *   - `X-Business-Use-Case-Usage` — the Business Use Case limits that actually
 *     govern Marketing API traffic, per business and per use-case type.
 *     `{"<business-id>":[{"type":"ads_management","call_count":95,
 *       "total_cputime":20,"total_time":20,
 *       "estimated_time_to_regain_access":0}]}`
 *
 * Meta inverts the usual convention on both: the numbers are percentage of
 * quota CONSUMED, not remaining, and throttling starts when any one reaches
 * 100. So `remaining` below is `100 - used` and the unit is percent — a limit
 * of 100 is the literal truth here rather than a placeholder.
 *
 * `/me` is a platform call, so `X-App-Usage` is the header it reliably returns;
 * BUC headers appear on Marketing API edges. Both are read, whichever arrive.
 * This is also the closest thing Meta offers to a platform-health signal, since
 * metastatus.com is a human page and `service` is declared `unavailable`.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Headroom is context, not a verdict — `severity: "informational"` means this
 * state never worsens a roll-up. Meta throttles at 100% used, and warns well
 * before, so the thresholds are stated in percent-used terms.
 */
const fromUsedPercent = (used: number): HealthState => {
  if (used >= 100) return "down";
  if (used >= 90) return "degraded";
  return "ok";
};

const METERS = ["call_count", "total_cputime", "total_time"] as const;

function parseHeader(raw: string | null): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** `X-App-Usage` — a flat map of meter name to percent used. */
function readAppUsage(parsed: unknown, buckets: HealthQuota[], states: HealthState[]): void {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
  for (const [id, used] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof used !== "number") continue;
    states.push(fromUsedPercent(used));
    buckets.push({ id: `app.${id}`, limit: 100, remaining: 100 - used, unit: "percent" });
  }
}

/** `X-Business-Use-Case-Usage` — business id to a list of per-use-case readings. */
function readBusinessUsage(parsed: unknown, buckets: HealthQuota[], states: HealthState[]): void {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
  for (const entries of Object.values(parsed as Record<string, unknown>)) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue;
      const record = entry as Record<string, unknown>;
      const type = typeof record.type === "string" ? record.type : "business";
      for (const meter of METERS) {
        const used = record[meter];
        if (typeof used !== "number") continue;
        states.push(fromUsedPercent(used));
        buckets.push({
          id: `${type}.${meter}`,
          limit: 100,
          remaining: 100 - used,
          unit: "percent",
        });
      }
      // Non-zero means Meta is currently blocking this use case; the wait is in
      // minutes. That is a harder fact than any percentage.
      const wait = record.estimated_time_to_regain_access;
      if (typeof wait === "number" && wait > 0) {
        states.push("down");
        buckets.push({
          id: `${type}.blocked`,
          limit: 100,
          remaining: 0,
          unit: "percent",
          resetAt: new Date(Date.now() + wait * 60_000).toISOString(),
        });
      }
    }
  }
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API usage headroom",
  description:
    "Percentage of the app's call-count, CPU-time and total-time allowances consumed, read off `X-App-Usage` and `X-Business-Use-Case-Usage`. Meta throttles when any meter reaches 100.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/me?fields=id`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const buckets: HealthQuota[] = [];
    const states: HealthState[] = [];
    readAppUsage(parseHeader(res.headers.get("x-app-usage")), buckets, states);
    readBusinessUsage(
      parseHeader(res.headers.get("x-business-use-case-usage")),
      buckets,
      states,
    );

    if (buckets.length === 0) {
      return {
        state: "unknown",
        message: "response carried no readable X-App-Usage or X-Business-Use-Case-Usage header",
      };
    }

    return { state: worstHealthState(states), quota: buckets, ttlSeconds: 60 };
  },
};

export default quota;
