import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const SUMMARY = "https://status.lusha.com/api/v2/summary.json";

/** Statuspage page id of "Lusha Status Page" (its `page.name`), verified 2026-10-06. */
export const PAGE_ID = "swcqqk7psrfy";
/** The two components that cover API calls: "Lusha API" and "Prospecting". */
export const API_COMPONENTS: Record<string, string> = {
  bqq6gm6xj672: "Lusha API",
  g9tcs4jndlft: "Prospecting",
};

const MAP: Record<string, HealthState> = {
  operational: "ok",
  under_maintenance: "degraded",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
};
const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };

/**
 * Lusha's Atlassian Statuspage (`status.lusha.com`, page id `swcqqk7psrfy`). The page also rolls up
 * the browser plugin, dashboard, website, Engage and external AWS/Intercom services, so only the
 * `Lusha API` and `Prospecting` components are read — the top-level indicator would report the
 * API down because the marketing website is.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Lusha API status",
  description: "The `Lusha API` and `Prospecting` components of status.lusha.com.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 300,
  network: { allow: ["status.lusha.com"] },

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(SUMMARY, { headers: { accept: "application/json" } });
    } catch (e) {
      return { state: "unknown", message: `could not reach the status page: ${e}` };
    }
    if (!res.ok) return { state: "unknown", message: `the status page answered ${res.status}` };

    let body: {
      page?: { id?: string };
      components?: Array<{ id?: string; name?: string; status?: string }>;
    };
    try {
      body = await res.json();
    } catch {
      return { state: "unknown", message: "the status page did not return JSON" };
    }
    if (body.page?.id !== PAGE_ID) {
      return { state: "unknown", message: "the status page is not Lusha's (page id mismatch)" };
    }
    const mine = (body.components ?? []).filter((c) => c.id && API_COMPONENTS[c.id]);
    if (mine.length === 0) {
      return { state: "unknown", message: "the status page lists no Lusha API component" };
    }

    let state: HealthState = "ok";
    const notes: string[] = [];
    for (const c of mine) {
      const s = MAP[String(c.status)] ?? "unknown";
      if (s !== "ok") notes.push(`${API_COMPONENTS[c.id!]} is ${c.status}`);
      if (RANK[s] > RANK[state]) state = s;
    }
    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : "Lusha API and Prospecting operational",
      ttlSeconds: 300,
    };
  },
};

export default service;
