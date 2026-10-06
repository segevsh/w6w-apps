/**
 * Is Taskade up?
 *
 * ## Verified 2026-10-06
 *
 * Taskade's status page is an Atlassian Statuspage. `status.taskade.com` itself answers its HTML
 * shell for every path (including `/api/v2/summary.json` and `/index.json`), but the same
 * page's feed is served at `taskade.statuspage.io/api/v2/summary.json`: 200 JSON in Statuspage
 * schema with `page.id: "qh8w33xczvyl"`, `page.name: "Taskade"`, `page.url:
 * "http://status.taskade.com"`.
 *
 * ## There is a component for this app's surface
 *
 * The page lists a top-level component named exactly "App" (`crq065nyd9sb`) — the product the
 * API belongs to — beside an "Infrastructure" group (AWS) and a "DNS" group (Cloudflare) and
 * Stripe components. This check keys off "App", not the page indicator: an AWS SES or Stripe
 * component going red says nothing about the API. Other components are reported for visibility
 * only. There is no component literally named "API"; "App" is the closest, so a missing "App"
 * is `unknown`, never `down`.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://taskade.statuspage.io/api/v2/summary.json";
export const PAGE_ID = "qh8w33xczvyl";
export const APP_COMPONENT_ID = "crq065nyd9sb";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { id?: string; name?: string };
  components?: StatusComponent[];
  incidents?: unknown[];
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

const service: HealthCheckDefinition = {
  key: "service",
  title: "Taskade platform status",
  description: 'The "App" component from Taskade\'s Statuspage, plus its other components for ' +
    "visibility.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["taskade.statuspage.io"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Taskade — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };
    if (body.page?.id !== PAGE_ID) {
      return { state: "unknown", message: "status feed is no longer Taskade's Statuspage page" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.id && c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const s = mapComponentStatus(node.status);
      components[node.id!] = s === "ok"
        ? { state: s, message: node.name }
        : { state: s, message: `${node.name}: ${node.status}` };
    }

    const app = nodes.find((n) => n.id === APP_COMPONENT_ID);
    const state = app ? mapComponentStatus(app.status) : "unknown";
    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    const notes: string[] = [];
    if (!app) notes.push('"App" component not found on the status page');
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }
    if ((body.incidents?.length ?? 0) > 0) notes.push(`${body.incidents!.length} open incident(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
