import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

/**
 * Is Tidio's API up?
 *
 * ## Verified 2026-10-06
 *
 * `status.tidio.com` is a real Atlassian Statuspage: `GET /api/v2/summary.json` self-identifies
 * (`page.id` `gjgh0hrr6n4h`, `page.name` "Tidio", `page.url` `https://status.tidio.com`) while an
 * unknown `/api/v2/*.json` path answers an empty body. Components include Agent Dashboard, Chat
 * widget, Lyro AI, Flows, Ticketing System, Web & Desktop application, **API** (`8wy1nxcp6cvz`),
 * WebSocket, Shopify and Meta integrations. This app calls `api.tidio.com`, so only the `API`
 * component drives the verdict; the rest are reported for visibility. `history.atom` 404s, so
 * the JSON summary is the machine-readable source.
 */
export const STATUS_URL = "https://status.tidio.com/api/v2/summary.json";
export const PAGE_ID = "gjgh0hrr6n4h";
export const API_COMPONENT_ID = "8wy1nxcp6cvz";

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
  title: "Tidio API status",
  description:
    'The "API" component of status.tidio.com; other components are shown for visibility.',
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.tidio.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };
    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    if (body.page?.id !== PAGE_ID || body.page?.name !== "Tidio") {
      return { state: "unknown", message: "status page no longer self-identifies as Tidio's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const n of nodes) {
      const s = mapComponentStatus(n.status);
      components[n.id ?? n.name!] = s === "ok"
        ? { state: s, message: n.name }
        : { state: s, message: `${n.name}: ${n.status}` };
    }

    const api = nodes.find((n) => n.id === API_COMPONENT_ID);
    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    const notes: string[] = [];
    if (!api) notes.push('"API" component not found on the status page');
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }
    return {
      state: api ? mapComponentStatus(api.status) : "unknown",
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
