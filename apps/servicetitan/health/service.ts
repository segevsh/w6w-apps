/**
 * Is ServiceTitan up?
 *
 * ServiceTitan publishes at **`status.servicetitan.com`**, an Atlassian
 * Statuspage — verified live 2026-10-06: `GET /api/v2/summary.json` → 200 with
 * `page.id` `kwkkj5bkypmq`, `page.name` "ServiceTitan", 68 components and
 * `status.indicator` `none`.
 *
 * **The page-level indicator is NOT the verdict here.** The page rolls up the
 * whole company: telephony carriers, SMS, Phones Pro, Fleet Pro, Marketing Pro
 * and the mobile app are components beside the core product, and none of them
 * is on the path of an API call. Reporting the API down because a toll-free
 * carrier network is degraded would be wrong, so only the children of the
 * **"Core Product Features"** group (id `60t8f6j7hjq1` — Job Booking, Dispatch,
 * Accounting and their siblings) decide the verdict; every other component is
 * listed as detail. There is no component literally named "API".
 *
 * `credential: "none"` — a status host must never see a bearer token or the
 * `ST-App-Key`.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.servicetitan.com/api/v2/summary.json";
export const PAGE_ID = "kwkkj5bkypmq";
export const CORE_GROUP_ID = "60t8f6j7hjq1";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
  group_id?: string | null;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatusComponent[];
  incidents?: Array<{ name?: string; status?: string }>;
  scheduled_maintenances?: unknown[];
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
  title: "ServiceTitan platform status",
  description:
    "Component status from status.servicetitan.com. Only the Core Product Features group (Job " +
    "Booking, Dispatch, Accounting …) decides the verdict; telephony, SMS, Fleet Pro, Marketing " +
    "Pro and the mobile app are reported as detail.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.servicetitan.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about ServiceTitan — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // The page's `name` is ServiceTitan's own, but pin the id as well so a
    // redirect to somebody else's page can never be read as ServiceTitan's.
    if (body.page?.id !== PAGE_ID) {
      return {
        state: "unknown",
        message: "status page no longer self-identifies as ServiceTitan's",
      };
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

    const core = nodes.filter((n) => n.group_id === CORE_GROUP_ID);
    if (core.length === 0) {
      return {
        state: "unknown",
        message: "Core Product Features components not found on the status page",
        components,
      };
    }
    const state = worstHealthState(
      core.map((n) => components[n.id ?? n.name!].state),
    );

    const notes: string[] = [];
    const affectedCore = core.filter((n) => mapComponentStatus(n.status) !== "ok");
    if (affectedCore.length > 0) {
      notes.push(`affected: ${affectedCore.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }
    const otherAffected = nodes.filter((n) =>
      n.group_id !== CORE_GROUP_ID && mapComponentStatus(n.status) !== "ok"
    );
    if (otherAffected.length > 0) {
      notes.push(`${otherAffected.length} non-core component(s) affected`);
    }
    const openIncidents = body.incidents?.length ?? 0;
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
