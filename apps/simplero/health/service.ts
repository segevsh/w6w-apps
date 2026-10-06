import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

/**
 * Simplero's status page is `status.simplero.com` (an incident.io page serving the
 * Statuspage-compatible JSON schema: `page`, `status.indicator`, `components[].status`).
 * Verified 2026-10-06: `page.name` is "Simplero", `/api/v2/summary.json` answers JSON and a
 * bogus sibling path 404s.
 */
export const STATUS_URL = "https://status.simplero.com/api/v2/summary.json";

/** The component that is Simplero's API, as named on the page. */
export const API_COMPONENT = "API";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean | null;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatusComponent[];
  incidents?: Array<{ name?: string; status?: string }> | null;
  scheduled_maintenances?: unknown[] | null;
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
    case "full_outage":
      return "down";
    default:
      return "unknown";
  }
}

export function componentKey(component: StatusComponent, index: number): string {
  if (component.id) return component.id;
  if (component.name) {
    return `${
      component.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    }-${index}`;
  }
  return `component-${index}`;
}

/** A component that is not the API can lower the verdict to `degraded`, never to `down`. */
function capAtDegraded(state: HealthState): HealthState {
  return state === "down" ? "degraded" : state;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Simplero platform status",
  description:
    "Component status from status.simplero.com. The `API` component decides the verdict. " +
    "Background processing, the website and the third parties Simplero depends on (AWS, " +
    "Spreedly, Stripe, Twilio) are reported per component but can only lower the verdict to " +
    "degraded, since an outage there does not stop API calls.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.simplero.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Simplero — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // A claimed-but-wrong page is the failure mode this guards: read the NAME, not the 200.
    if (body.page?.name !== "Simplero") {
      return { state: "unknown", message: "status page no longer self-identifies as Simplero's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, index) => {
      const state = mapComponentStatus(node.status);
      components[componentKey(node, index)] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    });

    const api = nodes.find((n) => n.name === API_COMPONENT);
    if (!api) {
      return {
        state: "unknown",
        message: `Status page has no "${API_COMPONENT}" component`,
        components,
        ttlSeconds: 60,
      };
    }

    const state = worstHealthState([
      mapComponentStatus(api.status),
      ...nodes.filter((n) => n !== api).map((n) => capAtDegraded(mapComponentStatus(n.status))),
    ]);

    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    const openIncidents = body.incidents?.length ?? 0;
    const maintenance = body.scheduled_maintenances?.length ?? 0;

    const notes: string[] = [];
    if (body.status?.description) notes.push(body.status.description);
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s)`);
    if (maintenance > 0) notes.push(`${maintenance} scheduled maintenance window(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
