/**
 * Is Productive up?
 *
 * ## The status page is real; its machine-readable form is the page's own data endpoint
 *
 * Checked 2026-10-06. `status.productive.io` is an Uptime.com hosted status page (title
 * "Status | Uptime.com", `cname` `status.productive.io`, `slug` `productive`, page id 1856).
 * Every Statuspage / Better Stack / Atom path 404s (`/api/v2/summary.json`, `/index.json`,
 * `/history.atom`, `/history.rss`) and the page itself sets `rssURL: ""`, so none of the usual
 * feeds exist. What does exist is the JSON the page's own front end polls,
 * `/statuspage/productive/ajax` (`application/json`, `{success, error, data}`), which carries
 * the same `components[].status` the page renders. It is undocumented, so every field read
 * below is guarded and a surprise reads as `unknown`, never `down`.
 *
 * ## Which component decides
 *
 * Seven components: API Requests, Document Exporting, Mailing, Searching, Realtime
 * Notifications, Public Web, User Interface (APP). Only **API Requests** (id 5046, monitoring
 * `https://api.productive.io/heartbeat`) is evidence about the API this app calls, so it alone
 * sets the verdict; the other six are reported as detail and never move it.
 *
 * ## Provenance guard
 *
 * The page must self-identify (`slug: "productive"`, `cname: "status.productive.io"`). A
 * rebrand or a redirect onto someone else's page reads `unknown`.
 *
 * Status vocabulary (the page's own `componentStatusChoices`): `operational`,
 * `major-outage`, `partial-outage`, `degraded-performance`, `under-maintenance`.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.productive.io/statuspage/productive/ajax";
export const API_COMPONENT_ID = 5046;

interface StatusComponent {
  id?: number;
  name?: string;
  status?: string;
  is_group?: boolean;
}

interface StatusPage {
  success?: boolean;
  data?: {
    slug?: string;
    cname?: string;
    components?: StatusComponent[];
    active_incidents?: Array<{ name?: string }>;
  };
}

export function mapComponentStatus(status: string | undefined): HealthState {
  switch (status) {
    case "operational":
      return "ok";
    case "degraded-performance":
    case "partial-outage":
    case "under-maintenance":
      return "degraded";
    case "major-outage":
      return "down";
    default:
      return "unknown";
  }
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Productive platform status",
  description:
    "Component status from status.productive.io (Uptime.com page data). The API Requests " +
    "component decides; Document Exporting, Mailing, Searching, Realtime Notifications, Public " +
    "Web and the User Interface are reported as detail.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.productive.io"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status endpoint says nothing about Productive: never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as StatusPage | null;
    const data = body?.data;
    if (!data || !Array.isArray(data.components)) {
      return { state: "unknown", message: "Status page returned an unreadable body" };
    }
    if (data.slug !== "productive" || data.cname !== "status.productive.io") {
      return { state: "unknown", message: "status page no longer self-identifies as Productive's" };
    }

    const nodes = data.components.filter((c) => c?.name && c.is_group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const state = mapComponentStatus(node.status);
      components[String(node.id ?? node.name)] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    }

    const api = nodes.find((n) => n.id === API_COMPONENT_ID) ??
      nodes.find((n) => n.name === "API Requests");
    if (!api) {
      return {
        state: "unknown",
        message: "No API Requests component on the status page",
        components,
      };
    }

    const state = mapComponentStatus(api.status);
    const notes: string[] = [];
    if (state !== "ok") notes.push(`API Requests: ${api.status}`);
    const others = nodes.filter((n) => n !== api && mapComponentStatus(n.status) !== "ok");
    if (others.length > 0) {
      notes.push(
        `other components affected: ${others.map((n) => `${n.name} (${n.status})`).join(", ")}`,
      );
    }
    const incidents = data.active_incidents?.length ?? 0;
    if (incidents > 0) notes.push(`${incidents} active incident(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
