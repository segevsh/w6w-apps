/**
 * Is LiveChat up?
 *
 * ## The status page is real. Verified 2026-10-06
 *
 * `status.livechat.com` is an incident.io status page that serves Atlassian-compatible JSON.
 * `/api/v2/summary.json` answers 200 directly (no redirect) with `page.name` "LiveChat",
 * `status.indicator`, and six components: `Chat widget`, `Agent apps`, `API`, `Integrations`,
 * `Support chat on www.livechat.com` and `Subprocessors' service`. A bogus sibling path
 * (`/api/v2/bogus.json`) is a 404, so this is not a catch-all.
 *
 * ## One component covers the API
 *
 * The component literally named `API` decides the verdict. The others are reported but never move
 * it: a down chat widget or marketing-site support chat is not this app's API failing. If the
 * page ever drops the `API` component, the page-level indicator is used instead.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.livechat.com/api/v2/summary.json";
export const API_COMPONENT = "API";
export const PAGE_NAME = "LiveChat";

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
  title: "LiveChat platform status",
  description:
    "Component status from status.livechat.com (incident.io, Statuspage-compatible JSON). The " +
    "`API` component decides the verdict; the others are reported but never move it.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.livechat.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };
    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a redirect or rebrand pointing this probe at someone else's page.
    if (body.page?.name !== PAGE_NAME) {
      return { state: "unknown", message: "status page no longer self-identifies as LiveChat" };
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
