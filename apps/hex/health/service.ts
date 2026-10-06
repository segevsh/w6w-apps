/**
 * Hex platform status.
 *
 * Hex publishes a real Statuspage at status.hex.tech (page id `x0hffrksr5vy`,
 * `page.name` "Hex", verified 2026-10-06). It has NO component named "API". The
 * API is served from `app.hex.tech`, the same host as the product, so the verdict
 * reads `Main site` (the API's host), `Kernels` (every run executes on one) and
 * `Data Connections` (what a run queries through). `Login` and `Single tenant
 * stacks` are reported as detail but never decide the verdict: a login outage
 * does not stop token-authenticated calls, and a dedicated stack is not the
 * shared platform this connection talks to.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.hex.tech/api/v2/summary.json";
export const PAGE_ID = "x0hffrksr5vy";

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
  scheduled_maintenances?: unknown[];
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

/** Components that decide the verdict, and the worst state each may contribute. */
const DECIDING: Record<string, HealthState> = {
  "main site": "down",
  "kernels": "degraded",
  "data connections": "degraded",
};

const RANK: HealthState[] = ["ok", "unknown", "degraded", "down"];
function cap(state: HealthState, ceiling: HealthState): HealthState {
  return RANK.indexOf(state) > RANK.indexOf(ceiling) ? ceiling : state;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Hex platform status",
  description:
    "Component status from status.hex.tech. Main site (hosts the API), Kernels and Data " +
    "Connections decide the verdict; Login and Single tenant stacks are shown as detail.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.hex.tech"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    if (body.page?.id !== PAGE_ID) {
      return { state: "unknown", message: "status page no longer self-identifies as Hex's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    const deciding: HealthState[] = [];
    for (const node of nodes) {
      const state = mapComponentStatus(node.status);
      const key = node.id ?? node.name!.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      components[key] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
      const ceiling = DECIDING[node.name!.toLowerCase()];
      if (ceiling) deciding.push(cap(state, ceiling));
    }

    if (deciding.length === 0) {
      return { state: "unknown", message: "Status page lists none of the components this reads" };
    }

    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    const notes: string[] = [];
    if (body.status?.description) notes.push(body.status.description);
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }
    const open = body.incidents?.length ?? 0;
    if (open > 0) notes.push(`${open} open incident(s)`);

    return {
      state: worstHealthState(deciding),
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
