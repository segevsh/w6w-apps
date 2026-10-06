/**
 * Is the Runway API up? — status.runwayml.com, an Atlassian Statuspage.
 *
 * Verified real on 2026-10-06: `GET /api/v2/summary.json` answers 200 and self-identifies
 * (`page.id` "s9lfdrzmhryw", `page.name` "Runway"). Five flat components: App, Backend,
 * Billing, Support and **Public API** (id `w3jcq3dwljp4`). The developer API at
 * `api.dev.runwayml.com` is the "Public API" component; the web app and support portal are
 * separate surfaces (on the day this was measured "App" read `degraded_performance` while the
 * Public API was operational), so only "Public API" decides this app's verdict and the rest are
 * reported as detail. A broken status page is `unknown`, never `down`.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.runwayml.com/api/v2/summary.json";
export const PAGE_ID = "s9lfdrzmhryw";
export const API_COMPONENT_ID = "w3jcq3dwljp4";

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
  title: "Runway Public API status",
  description:
    'The "Public API" component of status.runwayml.com decides; the other components are shown as detail.',
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.runwayml.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "status page returned an unreadable body" };
    if (body.page?.id !== PAGE_ID) {
      return { state: "unknown", message: "status page is no longer Runway's (page id differs)" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) return { state: "unknown", message: "status page lists no components" };

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, i) => {
      const s = mapComponentStatus(node.status);
      components[componentKey(node, i)] = s === "ok"
        ? { state: s }
        : { state: s, message: `${node.name}: ${node.status}` };
    });

    const publicApi = nodes.find((n) => n.id === API_COMPONENT_ID);
    const state = publicApi ? mapComponentStatus(publicApi.status) : "unknown";

    const notes: string[] = [];
    if (!publicApi) notes.push('"Public API" component not found on the status page');
    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }
    const incidents = body.incidents?.length ?? 0;
    if (incidents > 0) notes.push(`${incidents} open incident(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
