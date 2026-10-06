/**
 * Is Uscreen's API up?
 *
 * ## The status page is real and has an API component (checked 2026-10-06)
 *
 * `status.uscreen.tv/api/v2/summary.json` answers the Atlassian Statuspage schema
 * (`status.indicator`, `components[]`) with `page.name` "Uscreen" and `page.id`
 * `hj2rt7vgpw2q`; a bogus sibling path (`/api/v2/nonexistent.json`) is a 404, so it is not a
 * catch-all. No redirect is involved. Its components include a group `API` (`ftmqdkrthd11`)
 * holding **`API V1`** (`v85f1q3jk6xj`) — the Publisher API this app calls — and `API V2`.
 * The verdict is the `API V1` component's; Storefront, Admin Portal, Video on Demand and Live
 * Streaming are shown as detail but do not drive it. Without an `API V1` component the
 * page-level indicator is the fallback.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.uscreen.tv/api/v2/summary.json";
export const PAGE_ID = "hj2rt7vgpw2q";
export const API_COMPONENT_ID = "v85f1q3jk6xj";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { id?: string; name?: string };
  components?: StatusComponent[];
  status?: { indicator?: string };
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
  title: "Uscreen API V1 status",
  description: "The API V1 component on status.uscreen.tv; the other Uscreen components " +
    "(storefront, admin portal, video on demand, live streaming) are reported as detail.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.uscreen.tv"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };
    if (body.page?.id !== PAGE_ID) {
      return { state: "unknown", message: "status page no longer self-identifies as Uscreen's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) return { state: "unknown", message: "Status page had no components" };

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, i) => {
      const state = mapComponentStatus(node.status);
      components[node.id ?? `component-${i}`] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    });

    const api = nodes.find((n) => n.id === API_COMPONENT_ID);
    const state = api ? mapComponentStatus(api.status) : mapIndicator(body.status?.indicator);

    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    const message = affected.length > 0
      ? `affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`
      : undefined;

    return { state, message, components, ttlSeconds: 60 };
  },
};

export default service;
