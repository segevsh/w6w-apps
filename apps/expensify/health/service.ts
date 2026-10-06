/**
 * Vendor status — status.expensify.com is an Atlassian Statuspage. Verified real on 2026-10-06:
 * `page.name` "Expensify", page id `n6mt6bg37zmv`, `GET /api/v2/summary.json` answers the
 * Statuspage v2 schema (`status.indicator` present) with 20 components. One of them,
 * **Integration APIs**, is the Integration Server this app calls, so it alone decides the verdict.
 * The other 19 (mobile app, cards, SmartScan, bank feeds, SMS, Chat…) are detail only: a Chase
 * feed outage must not mark a policy-update app down. `Report PDFs` is the one neighbour that
 * affects exports, so it is capped at `degraded`.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

const STATUS_HOST = "status.expensify.com";
export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;
export const PAGE_ID = "n6mt6bg37zmv";

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

const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "Expensify platform status",
  description:
    "status.expensify.com (Statuspage v2). The `Integration APIs` component decides; `Report PDFs` is capped at degraded; every other component is detail only.",
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

    if (body.page?.id !== PAGE_ID || !/^expensify$/i.test(body.page?.name ?? "")) {
      return {
        state: "unknown",
        message: `status page is not Expensify's (id ${body.page?.id}, name "${body.page?.name}")`,
      };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name);
    const api = nodes.find((c) => c.name === "Integration APIs");
    if (!api) {
      return { state: "unknown", message: "status page lists no `Integration APIs` component" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const state = mapComponentStatus(node.status);
      components[slug(node.name!)] = state === "ok"
        ? { state }
        : { state, message: `${node.name}: ${node.status}` };
    }

    let state = mapComponentStatus(api.status);
    const pdfs = nodes.find((c) => c.name === "Report PDFs");
    if (pdfs) {
      const p = mapComponentStatus(pdfs.status);
      const capped: HealthState = p === "down" ? "degraded" : p;
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
