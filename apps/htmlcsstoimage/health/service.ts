/**
 * Is HTML/CSS to Image up?
 *
 * ## The status page is real (checked 2026-10-06)
 *
 * `status.htmlcsstoimage.com` is an Atlassian Statuspage. `/api/v2/summary.json` answers
 * JSON in the Statuspage v2 schema with
 * `page: {id: "fzhv08zhzp1g", name: "HTML/CSS to Image API"}` and two components:
 * **`API`** (description "HTML/CSS to Image API. https://hcti.io") and `Website`
 * ("Website + dashboard"). The page id is pinned, since the host is a vanity domain.
 *
 * ## Verdict
 *
 * The `API` component decides: that is the one that describes `hcti.io`, which this app
 * calls. `Website` (marketing site and dashboard) is reported as detail and named in the
 * message but never moves the verdict, because a dashboard outage does not stop image
 * creation. If the page has no
 * `API` component the check falls back to the page-level indicator.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.htmlcsstoimage.com/api/v2/summary.json";
export const PAGE_ID = "fzhv08zhzp1g";

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
  status?: { indicator?: string; description?: string };
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

export function mapIndicator(indicator: string | undefined): HealthState {
  switch (indicator) {
    case "none":
      return "ok";
    case "minor":
    case "major":
    case "maintenance":
      return "degraded";
    case "critical":
      return "down";
    default:
      return "unknown";
  }
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "HTML/CSS to Image API status",
  description:
    "Status of the `API` component (hcti.io) on status.htmlcsstoimage.com; the website and " +
    "dashboard component is reported as detail and never decides the verdict.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.htmlcsstoimage.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body || typeof body !== "object") {
      return { state: "unknown", message: "Status page returned an unreadable body" };
    }
    if (body.page?.id !== PAGE_ID) {
      return { state: "unknown", message: "status page no longer self-identifies as HCTI's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const state = mapComponentStatus(node.status);
      const key = node.id ?? node.name!.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      components[key] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    }

    const api = nodes.find((n) => n.name === "API");
    let state: HealthState;
    let message: string | undefined;
    if (api) {
      state = mapComponentStatus(api.status);
      const others = nodes.filter((n) => n !== api && mapComponentStatus(n.status) !== "ok");
      const notes: string[] = [];
      if (state !== "ok") notes.push(`API: ${api.status}`);
      if (others.length > 0) {
        notes.push(`${others.map((n) => `${n.name} (${n.status})`).join(", ")} affected`);
      }
      message = notes.length > 0 ? notes.join("; ") : body.status?.description;
    } else {
      state = mapIndicator(body.status?.indicator);
      message = body.status?.description;
    }

    return { state, message, components, ttlSeconds: 60 };
  },
};

export default service;
