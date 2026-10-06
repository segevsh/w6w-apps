import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

/**
 * Is Sierra up? An Atlassian **Statuspage** at `status.sierrainteractive.com`, verified
 * 2026-10-06 and linked from Sierra's own site footer.
 *
 * - `GET /api/v2/summary.json` answers Statuspage's schema. Its `page.name` is the generic
 *   "Status Page", so identity is pinned by page **id** (`8stc99wmsg1b`), not by name.
 * - There is no "API" component. The six components are hosting regions: US Northeast, Southeast,
 *   Midwest, Southwest, West and Canada. A customer lives in one of them and this check cannot
 *   know which, so the verdict is the WORST region and each one is reported as a component.
 */

const STATUS_HOST = "status.sierrainteractive.com";

export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;

export const PAGE_ID = "8stc99wmsg1b";

export const STATE: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

const RANK: Record<HealthState, number> = { ok: 0, degraded: 1, down: 2, unknown: 3 };

interface Summary {
  page?: { id?: string };
  components?: Array<{ name?: string; status?: string; group?: boolean }>;
}

export function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Sierra platform status",
  description: "status.sierrainteractive.com (Atlassian Statuspage). Worst hosting region.",
  kind: "service",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    // `unknown`, never `down`: a failing status page says nothing about the vendor.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };
    const body = await res.json().catch(() => null) as Summary | null;
    if (!body) return { state: "unknown", message: "status page did not return JSON" };
    if (body.page?.id !== PAGE_ID) {
      return { state: "unknown", message: "status page is no longer Sierra's (page id changed)" };
    }

    const components: Record<string, HealthComponentReport> = {};
    let worst: HealthState = "ok";
    for (const c of body.components ?? []) {
      if (!c.name || c.group) continue;
      const state = STATE[c.status ?? ""] ?? "unknown";
      components[slug(c.name)] = state === "ok"
        ? { state, message: c.name }
        : { state, message: `${c.name}: ${c.status ?? "no status"}` };
      if (RANK[state] > RANK[worst]) worst = state;
    }
    if (Object.keys(components).length === 0) {
      return { state: "unknown", message: "status page returned no components" };
    }
    const affected = Object.values(components).filter((c) => c.state !== "ok");
    return {
      state: worst,
      message: affected.length > 0
        ? `affected: ${affected.map((c) => c.message).join(", ")}`
        : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
