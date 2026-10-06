/**
 * Is CleverReach up?
 *
 * ## The status page is real. Verified 2026-10-06
 *
 * `status.cleverreach.com` is an Atlassian Statuspage. `page.name` is `"CleverReach"` and the
 * response has the Statuspage v2 shape (`page{id,name,url,time_zone,updated_at}`, `components[]`
 * with `group`/`group_id`, `status{indicator,description}`). A bogus sibling path
 * (`/api/v2/zz-not-real.json`) is a 404, so this is not a catch-all.
 *
 * ## A component covers the API
 *
 * The 12 components include one literally named `Rest-API` (alongside `Platform availability`,
 * `Mail delivery`, `Forms`, `Reports`, `Integrations`, …). That one decides the verdict; the rest
 * are reported but never move it. If the page ever drops it, the page-level indicator is used.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.cleverreach.com/api/v2/summary.json";
export const API_COMPONENT = "Rest-API";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { name?: string; url?: string };
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
  title: "CleverReach platform status",
  description:
    "Component status from status.cleverreach.com (Statuspage). The `Rest-API` component decides " +
    "the verdict; the other components are reported but never move it.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.cleverreach.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };
    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a redirect or rebrand pointing this probe at someone else's page.
    if (body.page?.name !== "CleverReach") {
      return { state: "unknown", message: "status page no longer self-identifies as CleverReach" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((n, i) => {
      const state = mapComponentStatus(n.status);
      components[n.id ?? `component-${i}`] = state === "ok"
        ? { state, message: n.name }
        : { state, message: `${n.name}: ${n.status}` };
    });

    const api = nodes.find((n) => n.name === API_COMPONENT);
    const state = api ? mapComponentStatus(api.status) : mapIndicator(body.status?.indicator);

    const notes: string[] = [];
    if (body.status?.description) notes.push(body.status.description);
    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    if (affected.length) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }
    if ((body.incidents?.length ?? 0) > 0) notes.push(`${body.incidents!.length} open incident(s)`);

    return {
      state,
      message: notes.length ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
