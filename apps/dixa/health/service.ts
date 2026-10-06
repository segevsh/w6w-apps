/**
 * Is Dixa up?
 *
 * `status.dixa.io` is an Atlassian Statuspage (checked 2026-10-06: `page.id` `3thm1ndd6lgx`,
 * `page.name` `Dixa`, the Statuspage `components`/`status.indicator` shape, and a nonsense path
 * 404s). It has a component that covers this API: `Dixa API and Exports API`
 * (`k3z0jwsfc3y3`, inside the `Integrations` group). That component alone decides the verdict.
 * Outbound/Inbound Webhooks and Data Sync sit in the same group but are not this API; every
 * other component is reported as detail and never moves the state.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_HOST = "status.dixa.io";
export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;
export const PAGE_ID = "3thm1ndd6lgx";
export const API_COMPONENT_ID = "k3z0jwsfc3y3";
export const API_COMPONENT_NAME = "Dixa API and Exports API";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
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

export function findApiComponent(components: StatusComponent[]): StatusComponent | undefined {
  return components.find((c) => c.id === API_COMPONENT_ID) ??
    components.find((c) =>
      (c.name ?? "").trim().toLowerCase() === API_COMPONENT_NAME.toLowerCase()
    );
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Dixa platform status",
  description:
    "The `Dixa API and Exports API` component on Dixa's Statuspage. Every other component " +
    "(channels, telephony, AI features) is reported as detail but never drives the verdict.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    if (body.page?.id !== PAGE_ID) {
      return { state: "unknown", message: "status page no longer self-identifies as Dixa's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) return { state: "unknown", message: "Status page has no components" };

    const api = findApiComponent(nodes);
    if (!api) {
      return {
        state: "unknown",
        message: "status page no longer publishes a `Dixa API and Exports API` component",
      };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const state = mapComponentStatus(node.status);
      components[node.id ?? node.name!] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    }

    const state = mapComponentStatus(api.status);
    const notes: string[] = [];
    if (state !== "ok") notes.push(`API: ${api.status}`);
    const affected = nodes.filter((n) => n.id !== api.id && mapComponentStatus(n.status) !== "ok");
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
