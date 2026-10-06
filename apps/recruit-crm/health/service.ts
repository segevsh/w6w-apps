/**
 * Is Recruit CRM up?
 *
 * ## The status page is real, and Statuspage-compatible
 *
 * Checked 2026-10-06. `status.recruitcrm.io/api/v2/summary.json` answers
 * `page.name: "RecruitCRM"` with Statuspage's `{page, status:{description, indicator}, components}`
 * keys; `/api/v2/incidents.json` exists too and a nonsense sibling (`/api/v2/zz-nope.json`)
 * is a 404, so it is not a catch-all. `/index.json` and `/summary.json` 404, so it is not Better
 * Stack or Instatus.
 *
 * ## No component is the API
 *
 * The 24 components are named only by region (`Asia`, `Europe`, `North America`, repeated for
 * eight unnamed groups). None names the API, and the names repeat, so a component cannot be
 * identified. The verdict is the page-level `status.indicator`, and the check is declared
 * `informational` because that indicator speaks for the product, not specifically the API.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.recruitcrm.io/api/v2/summary.json";
export const PAGE_NAME = "RecruitCRM";

interface Summary {
  page?: { name?: string };
  status?: { indicator?: string; description?: string };
}

export function mapIndicator(indicator: string | undefined): HealthState {
  switch (indicator) {
    case "none":
      return "ok";
    case "minor":
    case "major":
    case "maintenance":
      return "degraded";
    case "critical":
      return "down";
    default:
      return "unknown";
  }
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Recruit CRM platform status",
  description:
    "Page-level indicator from status.recruitcrm.io. INFORMATIONAL: the page's components are " +
    "regions only and none names the API, so the whole-product indicator stands in for it.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  network: { allow: ["status.recruitcrm.io"] },
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };
    const body = await res.json().catch(() => null) as Summary | null;
    if (body?.page?.name !== PAGE_NAME || !body.status) {
      return { state: "unknown", message: "Status page is not the Recruit CRM Statuspage feed" };
    }
    const state = mapIndicator(body.status.indicator);
    return {
      state,
      message: state === "ok" ? undefined : body.status.description,
      ttlSeconds: 300,
    };
  },
};

export default service;
