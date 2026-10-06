/**
 * Vendor status — fireberry.statuspage.io is Fireberry's own Atlassian
 * Statuspage (linked from www.fireberry.com). Verified real on 2026-10-06:
 * `page.name` "Fireberry", page id `38bggw1y3d14`, and 17 components including
 * a dedicated `API`. An unknown path answers a bodiless 404, so this is not a
 * catch-all page. The `API` component speaks for this app; the other sixteen
 * (Integrations, Automations, Billing, Views, Dashboards, Communications, …)
 * are product areas, reported as detail only.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

const STATUS_HOST = "fireberry.statuspage.io";
export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;
export const PAGE_ID = "38bggw1y3d14";

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
    case "major_outage":
    case "full_outage":
      return "down";
    default:
      return "unknown";
  }
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "Fireberry platform status",
  description:
    "fireberry.statuspage.io (Statuspage v2). The `API` component decides; every other component is shown as detail only.",
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

    if (body.page?.id !== PAGE_ID || !/^fireberry$/i.test(body.page?.name ?? "")) {
      return {
        state: "unknown",
        message: `status page is not Fireberry's (id ${body.page?.id}, name "${body.page?.name}")`,
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

    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    const notes: string[] = [];
    if (body.status?.description) notes.push(body.status.description);
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }

    return {
      state: mapComponentStatus(api.status),
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
