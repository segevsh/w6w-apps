/**
 * Vendor status — status.dub.co is an incident.io page that serves the
 * Statuspage v2 shape. Verified real on 2026-10-06: `page.name` "Dub", page id
 * `01HR08CQ7SY70CGR4FQSPTCN84`; `dub.statuspage.io` is an inactive decoy
 * (`401 Your page is inactive`). The page lists four components — `App`, `API`,
 * `Link Redirects`, `Website` — and only `API` (api.dub.co) speaks for this app.
 * `Link Redirects` is shown as detail but capped at `degraded`: redirects serve
 * clicks, not API calls, so they cannot make the API itself `down`.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

const STATUS_HOST = "status.dub.co";
export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;
export const PAGE_ID = "01HR08CQ7SY70CGR4FQSPTCN84";

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
  title: "Dub platform status",
  description:
    "status.dub.co (incident.io, Statuspage v2 shape). The `API` component decides; `Link Redirects` is capped at degraded; the dashboard and website are detail only.",
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

    if (body.page?.id !== PAGE_ID || !/^dub$/i.test(body.page?.name ?? "")) {
      return {
        state: "unknown",
        message: `status page is not Dub's (id ${body.page?.id}, name "${body.page?.name}")`,
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
    const redirects = nodes.find((c) => c.name === "Link Redirects");
    if (redirects) {
      const r = mapComponentStatus(redirects.status);
      const capped: HealthState = r === "down" ? "degraded" : r;
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
