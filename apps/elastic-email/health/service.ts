import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

/**
 * Elastic Email's Atlassian Statuspage, verified 2026-10-06.
 *
 * `https://elasticemail.statuspage.io/api/v2/summary.json` is Statuspage-schema
 * (`page`, `status.indicator`, `components[]`, `incidents[]`), `page.name` is
 * `Elastic Email Status Page`, `page.id` is `qqs7zd1q0z5q`, and it has a
 * component `API.ELASTICEMAIL.COM` (`nfj1bq4byr9f`) — the host this app calls.
 * The other three (`ELASTICEMAIL.COM` web app, `SMTP.…`, `INBOUND.…`) are shown
 * as detail but never drive the verdict: this app speaks HTTP only.
 */
export const STATUS_HOST = "elasticemail.statuspage.io";
export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;
export const PAGE_ID = "qqs7zd1q0z5q";
export const API_COMPONENT_ID = "nfj1bq4byr9f";
export const API_COMPONENT_NAME = "API.ELASTICEMAIL.COM";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatusComponent[];
  incidents?: unknown[];
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
  title: "Elastic Email platform status",
  description:
    "The `API.ELASTICEMAIL.COM` component on Elastic Email's Statuspage. The web app, SMTP and " +
    "inbound components are reported as detail but never drive the verdict.",
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
      return {
        state: "unknown",
        message: "status page no longer self-identifies as Elastic Email's",
      };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) return { state: "unknown", message: "Status page has no components" };

    const api = findApiComponent(nodes);
    if (!api) {
      return {
        state: "unknown",
        message: "status page no longer publishes an `API.ELASTICEMAIL.COM` component",
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
