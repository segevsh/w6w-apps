/**
 * Is Procore's API up?
 *
 * ## The status page is real — verified 2026-10-06
 *
 * `status.procore.com` is an Atlassian Statuspage: `/api/v2/summary.json` answers
 * 200 with real JSON, `page.id` `jxb4w0vdl2tv`, `page.name` "Procore Technologies",
 * and no redirect. It is the vendor's whole-company page (about 150 components:
 * the web app, mobile apps, estimating, ERP integrations, the support site), so
 * the page-level indicator is ignored here — a Procore Community or Training
 * Center incident must not flag a healthy API.
 *
 * ## The component that covers the API
 *
 * `API Gateway` (id `47gjht5rzqch`). It sits inside the group named "Sandbox
 * Environments and API" (alongside `Webhooks`, `Developer Sandbox` and `Monthly
 * Sandbox`), and is the only component named for the API. It is pinned by id and
 * name together, and the page id is checked on every run, so a renamed or
 * re-parented component answers `unknown` instead of silently never firing.
 * `Webhooks` (id `944dgf517gm9`) is reported as detail but capped at `degraded`:
 * a webhook outage does not stop an API call.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_HOST = "status.procore.com";
export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;
export const STATUS_PAGE_ID = "jxb4w0vdl2tv";
export const API_COMPONENT_ID = "47gjht5rzqch";
export const WEBHOOKS_COMPONENT_ID = "944dgf517gm9";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
}

interface StatusSummary {
  page?: { id?: string; name?: string };
  components?: StatusComponent[];
}

/** Statuspage's documented component vocabulary. */
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
  title: "Procore API status",
  description:
    "Status of the `API Gateway` component on Procore's Atlassian Statuspage (status.procore.com). " +
    "The page covers the whole company, so its page-level indicator is ignored.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    // A broken status API says nothing about Procore itself — never `down`.
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };
    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };
    if (body.page?.id !== STATUS_PAGE_ID) {
      return { state: "unknown", message: "status page no longer self-identifies as Procore's" };
    }

    const all = body.components ?? [];
    const api = all.find((c) => c.id === API_COMPONENT_ID && c.name === "API Gateway");
    if (!api) return { state: "unknown", message: "Status page has no `API Gateway` component" };
    const webhooks = all.find((c) => c.id === WEBHOOKS_COMPONENT_ID);

    const apiState = mapComponentStatus(api.status);
    const components: Record<string, HealthComponentReport> = {
      [API_COMPONENT_ID]: apiState === "ok"
        ? { state: apiState, message: api.name }
        : { state: apiState, message: `${api.name}: ${api.status}` },
    };
    if (webhooks) {
      const s = mapComponentStatus(webhooks.status);
      components[WEBHOOKS_COMPONENT_ID] = {
        state: s === "down" ? "degraded" : s,
        message: s === "ok" ? webhooks.name : `${webhooks.name}: ${webhooks.status}`,
      };
    }

    return {
      state: apiState,
      message: apiState === "ok" ? undefined : `affected: ${api.name} (${api.status})`,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
