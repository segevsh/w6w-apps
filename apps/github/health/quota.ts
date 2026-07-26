/**
 * How much headroom is left on THIS credential — GitHub.
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
 *     failing a verdict over.
 *
 * Probe: `GET /rate_limit`, which is the best-designed probe in this pack.
 * GitHub documents it as not counting against the rate limit, it works with or
 * without a credential, and it answers for every bucket in one call — so this
 * is exactly the case the spec has in mind when it says *declare a check per
 * call you must make, report a component per thing that call tells you about*.
 * Five independent buckets come back from one request.
 *
 * What it does NOT cover: secondary ("abuse") limits, which are separate,
 * undocumented in advance, and surface as a 403 with `retry-after`.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Headroom is context, not a verdict — `severity: "informational"` means this
 * state never worsens a roll-up. It is reported honestly anyway so a UI can
 * show why a workflow is about to start getting 429s.
 */
const headroom = (remaining?: number, limit?: number): HealthState => {
  if (remaining === undefined) return "unknown";
  if (remaining <= 0) return "down";
  if (limit !== undefined && limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
};

interface RateResource {
  limit?: number;
  remaining?: number;
  used?: number;
  reset?: number;
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description:
    "Every rate-limit bucket GitHub meters — core, search, graphql and the rest — from a single `GET /rate_limit`, which does not itself count against the limit.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/rate_limit`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      resources?: Record<string, RateResource>;
    };
    const resources = body.resources ?? {};
    const entries = Object.entries(resources);
    if (entries.length === 0) {
      return { state: "unknown", message: "rate_limit returned no resource buckets" };
    }

    const buckets: HealthQuota[] = [];
    const components: Record<string, { state: HealthState; message?: string }> = {};
    for (const [id, r] of entries) {
      const state = headroom(r.remaining, r.limit);
      buckets.push({
        id,
        limit: r.limit,
        remaining: r.remaining,
        resetAt: r.reset === undefined ? undefined : new Date(r.reset * 1000).toISOString(),
        unit: "requests",
      });
      // One call, many components — a search-quota wipeout should not be
      // reported as "GitHub is out of quota".
      components[id] = { state, message: `${r.remaining ?? "?"}/${r.limit ?? "?"} remaining` };
    }

    return {
      state: worstHealthState(Object.values(components).map((c) => c.state)),
      components,
      quota: buckets,
      ttlSeconds: 60,
    };
  },
};

export default quota;
