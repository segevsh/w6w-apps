/**
 * Is Leadfeeder up?
 *
 * `status.leadfeeder.com` is an Atlassian-Statuspage page (checked 2026-10-06; its `page.name` is
 * "Leadfeeder", page id `hn1yjfj930h5`, and it also serves at `dealfront.statuspage.io`). It
 * carries 15 components including `Leadfeeder API` (id `t9x0v3jzvfkt`) and `Legacy Leadfeeder
 * API` (`nyhy0lgy30w1`) alongside `Web Visitors`, `Target`, `Campaigns`, `Echobot API`… This
 * app calls the current `/v1` API, so `Leadfeeder API` decides the verdict; every other
 * component is reported as detail and capped at `degraded`.
 *
 * A failing status API, an unreadable body or a page without that component is `unknown`.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.leadfeeder.com/api/v2/summary.json";
export const API_COMPONENT_ID = "t9x0v3jzvfkt";
export const API_COMPONENT = "Leadfeeder API";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
}

interface StatusSummary {
  page?: { id?: string; name?: string };
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
  title: "Leadfeeder API status",
  description: "The `Leadfeeder API` component of status.leadfeeder.com.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.leadfeeder.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };
    if (body.page?.name !== "Leadfeeder") {
      return { state: "unknown", message: "status page no longer self-identifies as Leadfeeder's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name);
    const api = nodes.find((c) => c.id === API_COMPONENT_ID) ??
      nodes.find((c) => c.name === API_COMPONENT);
    if (!api) {
      return { state: "unknown", message: `Status page has no "${API_COMPONENT}" component` };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const state = mapComponentStatus(node.status);
      const capped: HealthState = node === api || state !== "down" ? state : "degraded";
      components[node.id ?? node.name!] = capped === "ok"
        ? { state: capped, message: node.name }
        : { state: capped, message: `${node.name}: ${node.status}` };
    }

    const state = mapComponentStatus(api.status);
    return {
      state,
      message: state === "ok" ? undefined : `${API_COMPONENT}: ${api.status}`,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
