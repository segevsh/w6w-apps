/**
 * Is Plaid up? — its status page, read per-component.
 *
 * Verified 2026-08-18: `status.plaid.com` answers a Statuspage-shaped
 * `status.json` whose page is named "Plaid".
 *
 * What is worth watching is narrower than the whole page. Plaid publishes
 * components for its own API and for the institution connectivity behind it,
 * and those fail differently: the API being up while a swathe of banks are
 * unreachable is the normal Plaid failure, and it presents to a workflow as
 * per-Item errors rather than as an outage.
 *
 * So this reads the API and platform components for the verdict. The
 * institution-level truth is per Item and lives in `item-get`'s `error` field,
 * which is where a workflow should look when one user's data stops arriving
 * while everybody else's keeps coming.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

const STATUS_HOST = "status.plaid.com";

/** Statuspage's component vocabulary, mapped onto our four states. */
const STATES: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  under_maintenance: "degraded",
  major_outage: "down",
};

/** The components this app's calls ride on. */
const WATCHED = [/\bapi\b/i, /platform/i, /dashboard/i, /link/i];

interface Component {
  name?: string;
  status?: string;
  group?: boolean;
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "Plaid platform status",
  description:
    "Plaid's API and Link components. Institution-level trouble is per Item and shows up in " +
    "`item-get`'s error rather than here.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/components.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as { components?: Component[] } | null;
    if (!Array.isArray(body?.components)) {
      return { state: "unknown", message: "status page returned an unexpected shape" };
    }

    const components: Record<string, { state: HealthState; message?: string }> = {};
    const states: HealthState[] = [];
    const bad: string[] = [];

    for (const c of body.components) {
      if (c.group === true) continue;
      const name = String(c.name ?? "");
      if (!WATCHED.some((re) => re.test(name))) continue;
      const state = STATES[String(c.status)] ?? "unknown";
      components[slug(name)] = { state, message: c.status };
      states.push(state);
      if (c.status !== "operational") bad.push(`${name}: ${c.status}`);
    }

    if (states.length === 0) {
      return {
        state: "unknown",
        message: "the status page no longer names the API or Link components",
      };
    }

    return {
      state: worstHealthState(states),
      message: bad.length === 0 ? `${states.length} components operational` : bad.join("; "),
      components,
      ttlSeconds: 120,
    };
  },
};

export default service;
