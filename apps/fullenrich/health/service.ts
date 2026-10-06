/**
 * Vendor status — status.fullenrich.com is a Better Stack page (checked
 * 2026-10-06). The Statuspage paths (`/api/v2/summary.json`, `/summary.json`,
 * `/history.atom`) all answer the same 167 KB HTML shell; `/index.json` answers
 * Better Stack's JSON document and self-identifies as page id `183195`,
 * company_name "FullEnrich", custom_domain "status.fullenrich.com".
 *
 * The page lists ONE resource, `app.fullenrich.com/app` — the web app, on the
 * same host as the API (`app.fullenrich.com/api/v2`) but not the API itself.
 * It is therefore evidence, not a statement about the API: this check is
 * `informational` and capped at `degraded`, and the unsigned `api` check is what
 * speaks for API reachability.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

export const STATUS_HOST = "status.fullenrich.com";
export const STATUS_URL = `https://${STATUS_HOST}/index.json`;
export const PAGE_ID = "183195";
export const RESOURCE_NAME = "app.fullenrich.com/app";

interface BetterStackPage {
  data?: { id?: string; attributes?: { company_name?: string } };
  included?: { type?: string; attributes?: { public_name?: string; status?: string } }[];
}

export function mapResourceStatus(status: string | undefined): HealthState {
  switch (status) {
    case "operational":
    case "resolved":
      return "ok";
    case "degraded":
    case "maintenance":
    case "downtime":
    case "down":
      return "degraded";
    default:
      return "unknown";
  }
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "FullEnrich platform status",
  description:
    "status.fullenrich.com (Better Stack /index.json). Its only resource is the web app on the API's host, so this is informational and never reports worse than degraded.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as BetterStackPage | null;
    const attrs = body?.data?.attributes;
    if (!attrs) {
      return { state: "unknown", message: "status page did not return its JSON document" };
    }
    if (body?.data?.id !== PAGE_ID || !/fullenrich/i.test(attrs.company_name ?? "")) {
      return { state: "unknown", message: "status page no longer self-identifies as FullEnrich's" };
    }

    const mine = (body?.included ?? []).find((r) =>
      r.type === "status_page_resource" && r.attributes?.public_name === RESOURCE_NAME
    );
    if (!mine) {
      return { state: "unknown", message: `status page names no "${RESOURCE_NAME}" resource` };
    }

    const state = mapResourceStatus(mine.attributes?.status);
    return {
      state,
      message: state === "ok" ? "web app operational" : `web app ${mine.attributes?.status}`,
      ttlSeconds: 60,
    };
  },
};

export default service;
