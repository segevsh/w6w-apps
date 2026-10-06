/**
 * Is Skyvern up?
 *
 * `status.skyvern.com` is an Atlassian Statuspage (checked 2026-10-06: `page.id` `vz1pz14l5w34`,
 * `page.name` `Skyvern`, Statuspage `status`/`components` shape; `skyvern.statuspage.io` serves
 * the identical page). It has three components, no groups:
 *
 *   - `Skyvern API` (`xnr81ldhd29n`)           — this app's host, decides the verdict
 *   - `Skyvern Async Workers` (`dhzw86hnw984`) — executes every run, so it decides too
 *   - `Skyvern Cloud (Web Application)` (`pgvd35gh7syv`) — the dashboard; detail only
 *
 * The verdict is the worse of the first two; the web app is reported but never moves it.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_HOST = "status.skyvern.com";
export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;
export const PAGE_ID = "vz1pz14l5w34";
export const API_COMPONENT_ID = "xnr81ldhd29n";
export const WORKERS_COMPONENT_ID = "dhzw86hnw984";

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

const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };

const service: HealthCheckDefinition = {
  key: "service",
  title: "Skyvern platform status",
  description:
    "The `Skyvern API` and `Skyvern Async Workers` components on Skyvern's Statuspage; the web " +
    "application component is reported as detail only.",
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
      return { state: "unknown", message: "status page no longer self-identifies as Skyvern's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    const api = nodes.find((c) => c.id === API_COMPONENT_ID);
    const workers = nodes.find((c) => c.id === WORKERS_COMPONENT_ID);
    if (!api) {
      return {
        state: "unknown",
        message: "status page no longer publishes a `Skyvern API` component",
      };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const state = mapComponentStatus(node.status);
      components[node.id ?? node.name!] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    }

    const deciding = [api, workers].filter((c): c is StatusComponent => !!c);
    const state = deciding
      .map((c) => mapComponentStatus(c.status))
      .reduce<HealthState>((worst, s) => (RANK[s] > RANK[worst] ? s : worst), "ok");
    const affected = deciding.filter((c) => mapComponentStatus(c.status) !== "ok");
    const web = nodes.filter((c) => !deciding.includes(c) && mapComponentStatus(c.status) !== "ok");
    const notes: string[] = [];
    if (affected.length) notes.push(affected.map((c) => `${c.name}: ${c.status}`).join(", "));
    if (web.length) {
      notes.push(`also affected: ${web.map((c) => `${c.name} (${c.status})`).join(", ")}`);
    }

    return {
      state,
      message: notes.length ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
