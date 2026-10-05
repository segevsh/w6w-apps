import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

/**
 * status.rippling.com is a real Atlassian Statuspage (verified 2026-10-05):
 * `page.id` `dtj0jj1f02xs`, `page.name` "Rippling", 25 components, one of them a
 * `Platform API` — the REST API's own component. `rippling.statuspage.io` is
 * the inactive decoy (401 "Your page is inactive").
 *
 * The page covers the whole company — Payroll, Benefits, Devices, RADIUS — and
 * most of that is nothing to do with this app, so the page-level indicator is
 * deliberately NOT used: a payroll incident would mark every API connection
 * degraded. Only the components a REST call depends on are read.
 */
export const STATUS_URL = "https://status.rippling.com/api/v2/summary.json";
export const PAGE_ID = "dtj0jj1f02xs";

/** Weighted fully: an outage here is an outage of this app. */
export const API_COMPONENT = { id: "4t3nv95fsdms", name: "Platform API" };
/** Capped at `degraded`: they gate the app and sign-in, not the REST surface itself. */
export const SUPPORTING_COMPONENTS = [
  { id: "lq3c3hps2qqf", name: "Rippling App" },
  { id: "73fdn9j7bj7y", name: "Authentication" },
];

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatusComponent[];
  incidents?: Array<{ name?: string }>;
}

export function mapComponentStatus(status: string | undefined): HealthState {
  switch (status) {
    case "operational":
      return "ok";
    case "degraded_performance":
    case "partial_outage":
    case "under_maintenance":
      return "degraded";
    case "major_outage":
      return "down";
    default:
      return "unknown";
  }
}

function find(components: StatusComponent[], want: { id: string; name: string }) {
  return components.find((c) => c.id === want.id) ??
    components.find((c) => c.group !== true && c.name === want.name);
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Rippling platform status",
  description:
    "status.rippling.com: the Platform API component (weighted fully) plus Rippling App and " +
    "Authentication (capped at degraded). Payroll, Benefits and the other company-wide " +
    "components are ignored.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.rippling.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Pin the page id, not just the name: this is the Statuspage schema or it is nothing.
    if (body.page?.id !== PAGE_ID || !Array.isArray(body.components)) {
      return { state: "unknown", message: "status page no longer matches Rippling's Statuspage" };
    }

    const api = find(body.components, API_COMPONENT);
    if (!api) return { state: "unknown", message: "Platform API component not found on the page" };

    const components: Record<string, HealthComponentReport> = {};
    const apiState = mapComponentStatus(api.status);
    components[API_COMPONENT.id] = apiState === "ok"
      ? { state: apiState, message: API_COMPONENT.name }
      : { state: apiState, message: `${API_COMPONENT.name}: ${api.status}` };

    const states: HealthState[] = [apiState];
    for (const want of SUPPORTING_COMPONENTS) {
      const c = find(body.components, want);
      if (!c) continue;
      const raw = mapComponentStatus(c.status);
      const state: HealthState = raw === "down" ? "degraded" : raw;
      components[want.id] = state === "ok"
        ? { state, message: want.name }
        : { state, message: `${want.name}: ${c.status}` };
      states.push(state);
    }

    const open = body.incidents?.length ?? 0;
    return {
      state: worstHealthState(states),
      message: open > 0 ? `${open} open incident(s) on status.rippling.com` : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
