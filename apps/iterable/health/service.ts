/**
 * Is Iterable up? — Atlassian Statuspage (`status.iterable.com`).
 *
 * Verified 2026-10-06: `GET /api/v2/summary.json` answers 200 with
 * `page.name = "Iterable"`, `page.id = "hm1wdv9pcjp9"` (Statuspage schema:
 * `status.indicator`, `components[]`). The page is real and is about the
 * product this app calls.
 *
 * ## Why not the page-level `status.indicator`
 *
 * The page has 556 components — one group per customer **cluster** (Cluster 5
 * … 150, plus `EU - C1`/`EU - C2`), each with seven per-cluster components
 * (Email Sends, User Updates, …). The rolled-up indicator turns `minor` the
 * moment any single cluster has a problem, which would degrade every
 * connection whether or not it lives on that cluster, and a Connection does
 * not know its cluster. So this check reads only the **global, ungrouped**
 * components (`group_id == null`): Global API Ingestion, Global API Success,
 * Global Analytics Processing, Global Campaign Sends, Global Catalog, Global
 * Journey Processing, Global Links, Global Partner Webhooks, Global Proof
 * Sends, Global System Webhooks, Global Web Application. "Global API
 * Ingestion" and "Global API Success" cover the API itself. Cluster-level
 * incidents are not attributed to any connection.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const COMPONENT: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

const RANK: Record<string, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const STATUS_HOST = "status.iterable.com";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Iterable platform status",
  description:
    "Atlassian Statuspage for status.iterable.com, judged on the global (non-cluster) components. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails says nothing about the vendor.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      page?: { name?: string };
      components?: Array<
        { name?: string; status?: string; group?: boolean; group_id?: string | null }
      >;
    };
    if (body.page?.name !== "Iterable") {
      return { state: "unknown", message: "status page did not identify as Iterable" };
    }

    const components: Record<string, { state: HealthState }> = {};
    let worst: HealthState | undefined;
    for (const c of body.components ?? []) {
      if (!c.name || c.group || c.group_id) continue;
      const state = COMPONENT[c.status ?? ""] ?? "unknown";
      components[slug(c.name)] = { state };
      if (worst === undefined || RANK[state] > RANK[worst]) worst = state;
    }
    if (worst === undefined) return { state: "unknown", message: "no global components reported" };

    return { state: worst, components, ttlSeconds: 60 };
  },
};

export default service;
