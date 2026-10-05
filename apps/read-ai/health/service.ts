/**
 * Is Read AI up?
 *
 * `status.read.ai` is a real Atlassian Statuspage (verified 2026-10-05):
 * `/api/v2/summary.json` answers 200 JSON with
 * `page: {id: "bqc0948459l6", name: "Read AI", url: "https://status.read.ai"}`,
 * an unknown path 404s with no body (so it is not a catch-all), and its
 * components include `API` ("Backend APIs", id `28g5f1vvw06f`) next to meeting
 * bots, Sign-In/Login, the web/desktop/mobile apps and report generation.
 *
 * The verdict is the `API` component, because that is the only one this app
 * calls. Every other component is reported for detail but capped at `degraded`:
 * a Teams-bot outage is real but does not stop `GET /v1/meetings`.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.read.ai/api/v2/summary.json";
/** Pinned: the API component's stable id on the Statuspage. */
export const API_COMPONENT_ID = "28g5f1vvw06f";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
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

const service: HealthCheckDefinition = {
  key: "service",
  title: "Read AI platform status",
  description:
    "Component status from status.read.ai. The verdict is the API component; meeting bots, " +
    "sign-in and the apps are reported in the detail but cannot push the verdict past degraded.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.read.ai"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as {
      page?: { id?: string; name?: string };
      components?: StatusComponent[];
    } | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };
    if (body.page?.name && !/read/i.test(body.page.name)) {
      return { state: "unknown", message: "status page no longer self-identifies as Read AI's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    const api = nodes.find((c) => c.id === API_COMPONENT_ID) ??
      nodes.find((c) => c.name === "API");
    if (!api) return { state: "unknown", message: "Status page has no API component" };

    const components: Record<string, HealthComponentReport> = {};
    const states: HealthState[] = [];
    for (const node of nodes) {
      const mapped = mapComponentStatus(node.status);
      const isApi = node === api;
      // Non-API components never outrank `degraded`.
      const state = !isApi && mapped === "down" ? "degraded" : mapped;
      states.push(state);
      components[node.id ?? node.name!] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    }

    const apiState = mapComponentStatus(api.status);
    const affected = nodes.filter((n) => n !== api && mapComponentStatus(n.status) !== "ok");
    const notes: string[] = [];
    if (apiState !== "ok") notes.push(`API: ${api.status}`);
    if (affected.length > 0) {
      notes.push(`also affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }
    return {
      state: worstHealthState(states),
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
