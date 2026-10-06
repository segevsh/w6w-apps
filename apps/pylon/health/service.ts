/**
 * Vendor status — status.usepylon.com is an incident.io page serving the Statuspage v2 shape.
 * Verified real on 2026-10-06: `page.name` "Pylon", page id `01JHPCG4SED0GNWGYF7HG591AE`; it lists
 * eighteen components (Dashboard, Chat & Messaging, Email, CRM, API, Triggers & Workflows, Customer
 * Portal, …) and only `API` speaks for this app, which calls nothing else. The rest are shown as
 * detail. `pylon.statuspage.io` is NOT Pylon's: it is a different company's page (an Australian
 * "Pylon" at status.getpylon.com with a "Partner API" component), so it is never used.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

const STATUS_HOST = "status.usepylon.com";
export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;
export const PAGE_ID = "01JHPCG4SED0GNWGYF7HG591AE";

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

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "Pylon platform status",
  description:
    "status.usepylon.com (incident.io, Statuspage v2 shape). The `API` component decides; every other component is detail only.",
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

    if (body.page?.id !== PAGE_ID || !/^pylon$/i.test(body.page?.name ?? "")) {
      return {
        state: "unknown",
        message: `status page is not Pylon's (id ${body.page?.id}, name "${body.page?.name}")`,
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

    const state = mapComponentStatus(api.status);
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
