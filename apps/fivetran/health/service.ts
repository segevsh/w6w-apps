/**
 * Is Fivetran up? — its status page, which publishes exactly one thing.
 *
 * ## What is actually there
 *
 * Verified 2026-08-18: `status.fivetran.com` serves a JavaScript application,
 * and behind it **only `/api/v2/status.json` exists**:
 *
 * ```json
 * {"status":{"indicator":"none","description":"All Systems Operational"},
 *  "page":{"updated_at":"2026-08-18T19:31:13.976357Z"}}
 * ```
 *
 * `/api/v2/components.json` and `/api/v2/incidents.json` both answer **404**.
 * The page has no `id` and no `name` either — it is Statuspage-shaped rather
 * than a Statuspage, and a client that assumes the rest of that API is there
 * gets nothing.
 *
 * So this reads the indicator and no more. It is coarser than most checks in
 * this pack — an incident cannot be attributed to the API rather than to sync
 * infrastructure — and it is the whole of what the vendor publishes.
 *
 * The `connections` check is where the question a data team actually asks —
 * "is anything broken" — gets answered, from the account itself.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const STATUS_HOST = "status.fivetran.com";

/** Statuspage's four indicators, mapped onto our states. */
const INDICATORS: Record<string, HealthState> = {
  none: "ok",
  minor: "degraded",
  major: "down",
  critical: "down",
  maintenance: "degraded",
};

const service: HealthCheckDefinition = {
  key: "service",
  title: "Fivetran platform status",
  description:
    "The overall indicator from Fivetran's status page, which is all it publishes — its " +
    "components and incidents endpoints both answer 404.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/status.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as
      | { status?: { indicator?: string; description?: string } }
      | null;
    const indicator = body?.status?.indicator;
    if (!indicator) {
      return { state: "unknown", message: "status page returned no indicator" };
    }

    return {
      state: INDICATORS[indicator] ?? "unknown",
      message: body?.status?.description ?? indicator,
      ttlSeconds: 120,
    };
  },
};

export default service;
