/**
 * Is Statuspage itself up? — read from Statuspage's own status page, which is
 * a Statuspage.
 *
 * The recursion is not a joke: Atlassian runs `metastatuspage.com`, verified
 * 2026-08-18 to be an ordinary Statuspage instance whose page is named
 * "Atlassian Statuspage". So this check reads the same `components.json` shape
 * that every other health check in this pack reads — and that this app's own
 * actions write.
 *
 * It matters more than a usual vendor check, because of what this app is for.
 * When Statuspage is down, a workflow cannot tell its customers that anything
 * *else* is down: the outage silences the channel used to report outages. A
 * check that catches it lets a workflow fall back to another channel rather
 * than assuming the message got out.
 *
 * The API component is what this app rides on; the public-page components
 * matter for whether readers can see what was published, which is a different
 * failure with the same cause. Both are watched.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

const STATUS_HOST = "metastatuspage.com";

/** Statuspage's component vocabulary — the same one this app writes. */
const STATES: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  under_maintenance: "degraded",
  major_outage: "down",
};

/** What this app depends on: the API to write, the pages to be read. */
const WATCHED = [/api/i, /status page/i, /public page/i, /notification/i, /email/i];

interface Component {
  name?: string;
  status?: string;
  group?: boolean;
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "Statuspage platform status",
  description:
    "Atlassian's own Statuspage. Worth watching precisely because an outage here silences the " +
    "channel a workflow would use to report every other outage.",
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
        message: "the status page no longer names the components this app watches",
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
