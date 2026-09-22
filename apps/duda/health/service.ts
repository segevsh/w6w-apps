import type { HealthCheckDefinition, HealthState } from "@w6w/types";

/**
 * Is the Duda API up?
 *
 * ## A real Statuspage instance, verified live 2026-09-22
 *
 * `https://status.duda.co/api/v2/summary.json` — page id `j091xm0zc1x9`, named
 * "Duda", with `status.indicator: none` ("All Systems Operational") at the time
 * of checking.
 *
 * ## Only the `API` component counts
 *
 * The page carries five flat components — `Live Sites`, `Editor`, `API`,
 * `Sandbox`, `eCommerce` — and four of them are Duda's own UI and hosting
 * surfaces. A broken editor is not a broken Partner API: this app's calls would
 * be working perfectly while Duda's customers could not open the builder, and
 * rolling those together would report an outage that is not one for anything
 * this app does. So the check reads the component named **`API`** and nothing
 * else, and `unknown` — never `down` — if a future response stops naming it.
 */
const STATUS_HOST = "status.duda.co";

/** The one component this app's HTTP calls depend on. */
const API_COMPONENT = "api";

/** Statuspage's component vocabulary, mapped onto our four states. */
const STATES: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  under_maintenance: "degraded",
  major_outage: "down",
};

interface Component {
  name?: string;
  status?: string;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Duda API status",
  description:
    "The `API` component of Duda's own status page. The page's other components — Live Sites, " +
    "Editor, Sandbox, eCommerce — are Duda's UI and hosting surfaces and do not affect this app.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as { components?: Component[] } | null;
    if (!Array.isArray(body?.components)) {
      return { state: "unknown", message: "status page returned an unexpected shape" };
    }

    const api = body.components.find(
      (c) => String(c.name ?? "").trim().toLowerCase() === API_COMPONENT,
    );
    // Mirrors the case this check exists to avoid: a page that stopped
    // publishing the component is not evidence of an outage either way.
    if (!api) {
      return {
        state: "unknown",
        message: "the status page no longer names an `API` component",
      };
    }

    const status = String(api.status ?? "");
    const state = STATES[status] ?? "unknown";
    return {
      state,
      message: `${api.name}: ${status || "no status reported"}`,
      components: { api: { state, message: status } },
      ttlSeconds: 120,
    };
  },
};

export default service;
