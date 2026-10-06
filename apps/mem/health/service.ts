import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.mem.ai/api/v2/summary.json";
export const PAGE_ID = "01HSH3R704JC0MAEVQYDPBEK3K";
export const COMPONENT_NAME = "API";

/**
 * status.mem.ai is an incident.io-hosted page that serves a Statuspage-compatible
 * `/api/v2/summary.json`. Measured 2026-10-06: `page.name` is "Mem", `page.id` is
 * `01HSH3R704JC0MAEVQYDPBEK3K`, and `components[]` holds exactly one component,
 * named "API" (the page's own `/index.json` is an HTML 404 and is not used).
 * The page id is pinned so a re-pointed host reports `unknown`, not a verdict.
 */
export function mapComponentStatus(status: unknown): HealthState {
  switch (status) {
    case "operational":
      return "ok";
    case "degraded_performance":
    case "partial_outage":
    case "under_maintenance":
      return "degraded";
    case "major_outage":
    case "full_outage":
      return "down";
    default:
      return "unknown";
  }
}

interface Summary {
  page?: { id?: string; name?: string };
  components?: Array<{ id?: string; name?: string; status?: string }>;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Mem API status",
  description: "The 'API' component of status.mem.ai. Unauthenticated and unsigned.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.mem.ai"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    // `unknown`, never `down`: a failing status page says nothing about the vendor.
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };
    const body = await res.json().catch(() => null) as Summary | null;
    if (!body?.page || !Array.isArray(body.components)) {
      return { state: "unknown", message: "Status page returned an unreadable body" };
    }
    if (body.page.id !== PAGE_ID) {
      return { state: "unknown", message: "status page no longer self-identifies as Mem's" };
    }
    const api = body.components.find((c) => c.name === COMPONENT_NAME);
    if (!api) return { state: "unknown", message: `'${COMPONENT_NAME}' component not found` };

    const state = mapComponentStatus(api.status);
    const components: Record<string, HealthComponentReport> = {
      [String(api.id ?? api.name)]: state === "ok"
        ? { state, message: COMPONENT_NAME }
        : { state, message: `${COMPONENT_NAME}: ${api.status}` },
    };
    return {
      state,
      message: state === "ok" ? undefined : `${COMPONENT_NAME}: ${api.status}`,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
