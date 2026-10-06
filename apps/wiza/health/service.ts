/**
 * Is Wiza up?
 *
 * ## Verified 2026-10-06
 *
 * `status.wiza.co` is a real Atlassian-Statuspage-shaped page: `GET /api/v2/summary.json`
 * answers 200 and self-identifies (`page.id: "4kq3dv00xkgb"`, `page.name: "Wiza"`,
 * `page.url: "https://status.wiza.co"`); a bogus sibling path 404s, so it is not a catch-all.
 *
 * ## There is a component for this app's surface
 *
 * It lists four flat components: Wiza Web Application, **Wiza API** (`wyrqs0vs76yr`), Wiza
 * LinkedIn Plugin and Wiza Marketing Site. This check keys off the API component, not the
 * page indicator: the web app, the Chrome plugin and the marketing site say nothing about
 * `wiza.co/api`. The others are reported for visibility but do not drive `state`.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.wiza.co/api/v2/summary.json";
export const PAGE_ID = "4kq3dv00xkgb";

/** The component whose name identifies the surface every action in this app calls. */
export const API_COMPONENT_ID = "wyrqs0vs76yr";

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
  title: "Wiza platform status",
  description: 'The "Wiza API" component from status.wiza.co, plus the rest of Wiza\'s own ' +
    "status page for visibility.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.wiza.co"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Wiza — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a redirect or rebrand silently pointing this probe at someone else's page.
    if (body.page?.id !== PAGE_ID) {
      return { state: "unknown", message: "status page no longer self-identifies as Wiza's" };
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
      nodes.find((n) => n.name === "Wiza API");
    const state = apiComponent ? mapComponentStatus(apiComponent.status) : "unknown";

    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    const openIncidents = body.incidents?.length ?? 0;

    const notes: string[] = [];
    if (!apiComponent) notes.push('"Wiza API" component not found on the status page');
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
