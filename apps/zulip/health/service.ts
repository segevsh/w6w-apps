/**
 * Is Zulip Cloud up? — status.zulip.com, an Atlassian Statuspage.
 *
 * Verified real on 2026-10-06: `GET /api/v2/summary.json` answers 200 and self-identifies
 * (`page.id` "k9zkrxcgd1z1", `page.name` "Zulip Cloud"). The page's top-level component
 * "Zulip Cloud" (id `cnwsx15f4bpl`) is the chat service itself; the rest sit in a "Supporting
 * services" group (Static asset CDN, Loadbalancing, Outgoing email, Uploaded file storage) or are
 * separate surfaces (Mobile Push Notification Service, Email notifications). Only the
 * "Zulip Cloud" component decides this app's verdict — on the day this was measured the Static
 * asset CDN read `degraded_performance` while the API was answering normally — and the others are
 * reported as detail.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.zulip.com/api/v2/summary.json";
export const PAGE_ID = "k9zkrxcgd1z1";
export const CLOUD_COMPONENT_ID = "cnwsx15f4bpl";

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
  title: "Zulip Cloud status",
  description:
    'The "Zulip Cloud" component of status.zulip.com decides; supporting components are shown as detail.',
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.zulip.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    // A broken status page says nothing about Zulip — never `down`.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "status page returned an unreadable body" };
    if (body.page?.id !== PAGE_ID) {
      return {
        state: "unknown",
        message: "status page is no longer Zulip Cloud's (page id differs)",
      };
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

    const cloud = nodes.find((n) => n.id === CLOUD_COMPONENT_ID);
    const state = cloud ? mapComponentStatus(cloud.status) : "unknown";

    const notes: string[] = [];
    if (!cloud) notes.push('"Zulip Cloud" component not found on the status page');
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
