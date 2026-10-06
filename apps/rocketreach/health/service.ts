/**
 * Vendor status — status.rocketreach.co is an incident.io page that serves the
 * Statuspage v2 shape. Verified real on 2026-10-06: `page.name` "RocketReach",
 * page id `01JTK0DSQ2EAV562MX5BKDW29X`, generator `incident.io` in its Atom feed.
 * Five components: `RocketReach.co` (web app), `Extension`, `API`, `MCP` and
 * `RocketReach Verify`. Only `API` (api.rocketreach.co) speaks for this app;
 * `RocketReach Verify` backs just the Verify Email action, so it is capped at
 * `degraded`; the web app, extension and MCP are detail only.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

const STATUS_HOST = "status.rocketreach.co";
export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;
export const PAGE_ID = "01JTK0DSQ2EAV562MX5BKDW29X";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
}

interface StatusSummary {
  page?: { id?: string; name?: string };
  status?: { description?: string; indicator?: string };
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
    case "full_outage":
    case "major_outage":
      return "down";
    default:
      return "unknown";
  }
}

const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "RocketReach platform status",
  description:
    "status.rocketreach.co (incident.io, Statuspage v2 shape). The `API` component decides; `RocketReach Verify` is capped at degraded; the web app, extension and MCP are detail only.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    // `unknown`, never `down`: a failing status page says nothing about the vendor.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "status page returned an unreadable body" };

    if (body.page?.id !== PAGE_ID || !/^rocketreach$/i.test(body.page?.name ?? "")) {
      return {
        state: "unknown",
        message:
          `status page is not RocketReach's (id ${body.page?.id}, name "${body.page?.name}")`,
      };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name);
    const api = nodes.find((c) => c.name === "API");
    if (!api) return { state: "unknown", message: "status page lists no `API` component" };

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const state = mapComponentStatus(node.status);
      components[slug(node.name!)] = state === "ok"
        ? { state }
        : { state, message: `${node.name}: ${node.status}` };
    }

    let state = mapComponentStatus(api.status);
    const verify = nodes.find((c) => c.name === "RocketReach Verify");
    if (verify) {
      const v = mapComponentStatus(verify.status);
      const capped: HealthState = v === "down" ? "degraded" : v;
      if (RANK[capped] > RANK[state]) state = capped;
    }

    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    const notes: string[] = [];
    if (body.status?.description) notes.push(body.status.description);
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
