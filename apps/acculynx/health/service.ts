/**
 * Is AccuLynx up?
 *
 * ## Verified 2026-10-06
 *
 * AccuLynx publishes a real Atlassian Statuspage at `status.acculynx.com`: `GET
 * /api/v2/summary.json` answers 200 and self-identifies (`page.id: "plnhlfldnnpp"`,
 * `page.name: "AccuLynx"`, `page.url: "https://status.acculynx.com"`).
 *
 * ## There is a component for this app's surface
 *
 * Besides "Web Application", "Mobile Application", "Email Sending and Receiving" and an "Add-Ons"
 * group (AccuFi, AccuPay, EagleView, QuickBooks Online, ...), the page lists a top-level component
 * named exactly "API" (`kpktrjhb5pxz`). This check keys off that component, not the page
 * indicator: an outage of the web app or of an add-on says nothing about `api.acculynx.com`.
 * Every other component is reported for visibility but does not drive `state`.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.acculynx.com/api/v2/summary.json";

/** The component whose name identifies the surface every action in this app calls. */
export const API_COMPONENT_ID = "kpktrjhb5pxz";

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
  title: "AccuLynx platform status",
  description: 'The "API" component from status.acculynx.com, plus the rest of AccuLynx\'s own ' +
    "status page for visibility.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.acculynx.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about AccuLynx — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a redirect or rebrand silently pointing this probe at someone else's page.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.acculynx\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as AccuLynx's" };
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

    const apiComponent = nodes.find((n) => n.id === API_COMPONENT_ID);
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
