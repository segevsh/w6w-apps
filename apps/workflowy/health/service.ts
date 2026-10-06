/**
 * Is WorkFlowy up? `status.workflowy.com` is an Atlassian Statuspage, checked
 * 2026-10-06: `/api/v2/summary.json` answers 200 JSON (2,140 B, page.name
 * "WorkFlowy"), an invented sibling path answers 404, and the components are
 * WorkFlowy's own — Web App, iOS App, Android App, Desktop App, API, Websockets.
 *
 * Only the `API` component is about this app's surface, so it decides the
 * verdict; the other components are reported as detail but a broken iOS app does
 * not make the API unhealthy.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.workflowy.com/api/v2/summary.json";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatusComponent[];
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

const service: HealthCheckDefinition = {
  key: "service",
  title: "WorkFlowy platform status",
  description: "Component status from status.workflowy.com; the API component decides the verdict.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.workflowy.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.workflowy\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as WorkFlowy's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, i) => {
      const state = mapComponentStatus(node.status);
      components[node.id ?? `component-${i}`] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    });

    const api = nodes.find((n) => n.name?.trim().toLowerCase() === "api");
    if (!api) return { state: "unknown", message: "Status page has no API component", components };

    const state = mapComponentStatus(api.status);
    return {
      state,
      message: state === "ok" ? undefined : `API: ${api.status}`,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
