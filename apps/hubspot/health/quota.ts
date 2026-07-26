/**
 * How much headroom is left on THIS credential — HubSpot.
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
 * Probe: `GET /account-info/v3/details`, deliberately — it needs no object
 * scope. Probing `/crm/v3/objects/contacts` (which this app used to do) reports
 * a perfectly good private-app token as broken whenever it happens to be
 * entitled to deals but not contacts.
 *
 * HubSpot meters two windows at once: a daily allowance, which is the one a
 * bulk workflow exhausts, and a per-10-seconds burst.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

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

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description:
    "Daily and burst allowances remaining, read off the `X-HubSpot-RateLimit-*` headers.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/account-info/v3/details`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const h = res.headers;
    const dailyLimit = num(h.get("x-hubspot-ratelimit-daily"));
    const dailyRemaining = num(h.get("x-hubspot-ratelimit-daily-remaining"));
    const burstLimit = num(h.get("x-hubspot-ratelimit-secondly"));
    const burstRemaining = num(h.get("x-hubspot-ratelimit-secondly-remaining"));

    if (dailyRemaining === undefined && burstRemaining === undefined) {
      return { state: "unknown", message: "response carried no X-HubSpot-RateLimit-* headers" };
    }

    return {
      // Worst window wins. A burst dip recovers in seconds; a spent daily
      // allowance locks the portal out until midnight, so it deserves the flag.
      state: worstHealthState([
        headroom(dailyRemaining, dailyLimit),
        headroom(burstRemaining, burstLimit),
      ]),
      quota: [
        { id: "daily", limit: dailyLimit, remaining: dailyRemaining, unit: "requests" },
        { id: "burst", limit: burstLimit, remaining: burstRemaining, unit: "requests" },
      ],
      ttlSeconds: 60,
    };
  },
};

export default quota;
