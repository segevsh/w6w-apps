import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.woodpecker.co/api/v2/summary.json";

/**
 * status.woodpecker.co is an Atlassian Statuspage. Verified 2026-10-06:
 *
 *  - `/api/v2/summary.json` answers 200 `application/json` in the Statuspage v2 schema, while
 *    a bogus sibling `/api/v2/zzz-nope.json` answers 404 with 0 bytes: not a catch-all.
 *    `/index.json` and `/history.atom` answer too; `woodpecker.statuspage.io` serves the
 *    same page id.
 *  - The page is Woodpecker's own: `page.id` `rdk94jp5vv6h`, `page.name` "Woodpecker.co",
 *    time zone Europe/Warsaw.
 *  - Four components, no groups: "Woodpecker Web App", "Woodpecker API" (id
 *    `q9nwdd1b0y34`), "Woodpecker Lead Finder", "Woodpecker Domains".
 *
 * This app calls the REST API, so the "Woodpecker API" component decides the verdict. The
 * others are reported as detail (a Lead Finder outage must not mark prospect imports down).
 */
export const PAGE_ID = "rdk94jp5vv6h";
export const API_COMPONENT_ID = "q9nwdd1b0y34";
const API_COMPONENT_NAME = "woodpecker api";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatusComponent[];
  status?: { indicator?: string; description?: string };
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
  title: "Woodpecker platform status",
  description:
    "Component status from status.woodpecker.co. The 'Woodpecker API' component decides; the " +
    "web app, Lead Finder and Domains are shown as detail.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.woodpecker.co"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    if (body.page?.id !== PAGE_ID) {
      return { state: "unknown", message: "status page no longer self-identifies as Woodpecker's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const state = mapComponentStatus(node.status);
      components[node.id ?? node.name!] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    }

    const api = nodes.find((n) =>
      n.id === API_COMPONENT_ID || n.name?.trim().toLowerCase() === API_COMPONENT_NAME
    );
    if (!api) {
      return {
        state: "unknown",
        message: "Status page lists no 'Woodpecker API' component",
        components,
        ttlSeconds: 60,
      };
    }
    const state = mapComponentStatus(api.status);
    const detail = nodes.filter((n) => n !== api && mapComponentStatus(n.status) !== "ok")
      .map((n) => `${n.name} (${n.status})`);
    const notes: string[] = [];
    if (state !== "ok") notes.push(`${api.name}: ${api.status}`);
    if (detail.length > 0) notes.push(`also affected: ${detail.join(", ")}`);
    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
