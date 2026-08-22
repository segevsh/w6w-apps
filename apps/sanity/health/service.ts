/**
 * Is Sanity up? — its Statuspage, read per-component.
 *
 * Verified 2026-08-18: `status.sanity.io` redirects to
 * `www.sanity-status.com`, which is a Statuspage instance. This check calls the
 * final host directly, because a redirect chain is one more thing to be wrong
 * about.
 *
 * The components worth watching map onto what this app does — the Content Lake
 * (every query and mutation), the API CDN (reads, on a connection that opted
 * into it), and the asset pipeline. Studio and the management dashboard are
 * deliberately excluded: they are where humans work, and no action here touches
 * them.
 *
 * Annotation:
 *
 *   - `kind: "service"` — "is the vendor up", separate from "is this token
 *     live" (the derived `auth:token` check).
 *   - `scope: "app"` (the default) — the same answer for every Connection.
 *   - `credential: "none"` (also the default) — unauthenticated and unsigned.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

const STATUS_HOST = "www.sanity-status.com";

/** Statuspage's component vocabulary, mapped onto our four states. */
const STATES: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  under_maintenance: "degraded",
  major_outage: "down",
};

/** Component names are matched loosely, because status pages get reorganised. */
const WATCHED = [/content lake/i, /\bapi\b/i, /cdn/i, /asset/i];

/** Never decide the verdict on these — they are where humans work. */
const IGNORED = [/studio/i, /manage/i, /dashboard/i, /website/i, /docs/i];

interface Component {
  name?: string;
  status?: string;
  group?: boolean;
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "Sanity platform status",
  description:
    "The Content Lake, API and CDN components — the ones this app's queries and mutations ride " +
    "on. Studio and the management dashboard are excluded.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/components.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about Sanity.
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
      if (IGNORED.some((re) => re.test(name))) continue;
      if (!WATCHED.some((re) => re.test(name))) continue;

      const state = STATES[String(c.status)] ?? "unknown";
      components[slug(name)] = { state, message: c.status };
      states.push(state);
      if (c.status !== "operational") bad.push(`${name}: ${c.status}`);
    }

    if (states.length === 0) {
      return {
        state: "unknown",
        message: "the status page names no Content Lake, API, CDN or asset components",
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
