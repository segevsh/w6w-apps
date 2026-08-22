/**
 * Is WorkOS up? — its Statuspage, read per-component.
 *
 * Verified 2026-08-18: `status.workos.com` is a Statuspage instance whose page
 * is named "WorkOS".
 *
 * The split worth making is between **the API** this app calls and the
 * **runtime paths a customer's employees depend on** — SSO sign-in and Directory
 * Sync. They fail differently and the consequences are not comparable:
 *
 *   - the API being down stops a workflow reading or provisioning, while people
 *     already signed in carry on;
 *   - **SSO being down stops an entire customer's staff logging in**, which is
 *     an outage of the product WorkOS was bought to make possible, whatever
 *     this app is doing at the time.
 *
 * So SSO and Directory Sync count towards the verdict at full weight, and are
 * reported by name — a workflow watching this check is usually watching on
 * behalf of the customers, not itself.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

const STATUS_HOST = "status.workos.com";

/** Statuspage's component vocabulary, mapped onto our four states. */
const STATES: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  under_maintenance: "degraded",
  major_outage: "down",
};

/** Everything this app or its customers' users depend on. */
const WATCHED = [/api/i, /sso/i, /directory/i, /audit/i, /admin portal/i, /authkit/i, /dashboard/i];

interface Component {
  name?: string;
  status?: string;
  group?: boolean;
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "WorkOS platform status",
  description:
    "The API this app calls and the SSO and Directory Sync paths a customer's staff depend on — " +
    "the second mattering whatever the workflow is doing at the time.",
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
