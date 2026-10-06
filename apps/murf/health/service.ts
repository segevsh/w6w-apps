/**
 * Is Murf up?
 *
 * ## Verified 2026-10-06
 *
 * `murf.statuspage.io` is linked from the API docs site itself (`href="https://murf.statuspage.io/"`)
 * and is a real Atlassian Statuspage: `GET /api/v2/summary.json` answers 200 and self-identifies
 * (`page.id: "nhz5k8rbfzsz"`, `page.name: "Murf"`). `status.murf.ai` does not resolve, so the
 * statuspage.io host is the only one. The host is fetched directly (no redirect to follow).
 *
 * ## There is a component for this app's surface
 *
 * Two flat components: **API** (`yqlfvj3xhz52`, "All API services at api.murf.ai") and Studio
 * (the web editor). This check keys off the API component; Studio is reported for visibility but
 * does not drive `state`. The page's own timestamps date from 2025, which is how a quiet,
 * rarely-used page looks, not proof it is dead; the `page.id` guard below still protects against
 * a rebrand.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://murf.statuspage.io/api/v2/summary.json";
export const PAGE_ID = "nhz5k8rbfzsz";
export const API_COMPONENT_ID = "yqlfvj3xhz52";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatusComponent[];
  incidents?: Array<{ name?: string; status?: string }>;
}

/** Statuspage's documented component vocabulary. */
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

export function componentKey(component: StatusComponent, index: number): string {
  if (component.id) return component.id;
  if (component.name) {
    return `${
      component.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    }-${index}`;
  }
  return `component-${index}`;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Murf platform status",
  description: 'The "API" component from murf.statuspage.io, plus Studio for visibility.',
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["murf.statuspage.io"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Murf — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    if (body.page?.id !== PAGE_ID) {
      return { state: "unknown", message: "status page no longer self-identifies as Murf's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, index) => {
      const s = mapComponentStatus(node.status);
      components[componentKey(node, index)] = s === "ok"
        ? { state: s, message: node.name }
        : { state: s, message: `${node.name}: ${node.status}` };
    });

    const apiComponent = nodes.find((n) => n.id === API_COMPONENT_ID) ??
      nodes.find((n) => n.name === "API");
    const state = apiComponent ? mapComponentStatus(apiComponent.status) : "unknown";

    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    const openIncidents = body.incidents?.length ?? 0;

    const notes: string[] = [];
    if (!apiComponent) notes.push('"API" component not found on the status page');
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
