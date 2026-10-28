/**
 * How much headroom is left on THIS credential — Meta Graph API.
 *
 * Annotation (mirrors facebook-lead-ads — same vendor, same meter):
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
 *     failing a verdict over.
 *
 * Probe: `GET /me?fields=id`, the cheapest call any token (User or Page) can make.
 *
 * Meta inverts the usual convention: `X-App-Usage` reports percentage of quota
 * CONSUMED, not remaining, across three independent meters (call count, CPU
 * time, total time), and throttling starts when any one reaches 100. So
 * `remaining` below is `100 - used` and the unit is percent — a limit of 100 is
 * the literal truth here rather than a placeholder.
 *
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

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "App usage headroom",
  description:
    "Percentage of the app's call-count, CPU-time and total-time allowances consumed, read off `X-App-Usage`. Meta throttles when any meter reaches 100.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/me?fields=id`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const raw = res.headers.get("x-app-usage");
    if (!raw) return { state: "unknown", message: "response carried no X-App-Usage header" };

    let usage: Record<string, number>;
    try {
      usage = JSON.parse(raw) as Record<string, number>;
    } catch {
      return { state: "unknown", message: "X-App-Usage was not valid JSON" };
    }

    const buckets: HealthQuota[] = [];
    const states: HealthState[] = [];
    for (const [id, used] of Object.entries(usage)) {
      if (typeof used !== "number") continue;
      states.push(fromUsedPercent(used));
      buckets.push({ id, limit: 100, remaining: 100 - used, unit: "percent" });
    }
    if (buckets.length === 0) {
      return { state: "unknown", message: "X-App-Usage carried no numeric meters" };
    }

    return { state: worstHealthState(states), quota: buckets, ttlSeconds: 60 };
  },
};

export default quota;
