/**
 * Is Raisely up?
 *
 * `status.raisely.com` redirects to `https://www.raiselystatus.com`, an Atlassian Statuspage
 * (`page.name: "Raisely"`, page id `hxx1hf9gkz5h`, Statuspage schema — `status.indicator`,
 * `components[]` with `status` values `operational | degraded_performance | partial_outage |
 * major_outage | under_maintenance`). The runtime allowlists the URL passed here, not a redirect
 * target, so the declared host is the final one.
 *
 * The page lists six components: Websites, Donation & Payment Processing, Registration &
 * Ticketing Processing, Marketing Automation, **API** (`56pzw35gk2ff`), Admin Panel. This app's
 * dependency is the API component, which is pinned by id; the others can degrade independently.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

export const STATUS_URL = "https://www.raiselystatus.com/api/v2/summary.json";
export const PAGE_ID = "hxx1hf9gkz5h";
export const API_COMPONENT_ID = "56pzw35gk2ff";

interface StatusSummary {
  page?: { id?: string; name?: string };
  components?: Array<{ id?: string; name?: string; status?: string }>;
  incidents?: unknown[];
  status?: { indicator?: string };
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
  title: "Raisely API status",
  description: "The API component on Raisely's Statuspage (www.raiselystatus.com) — not the " +
    "Websites, Payment Processing or Admin Panel components, which degrade independently.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["www.raiselystatus.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    if (body.page?.id !== PAGE_ID || body.page?.name !== "Raisely") {
      return { state: "unknown", message: "status page no longer self-identifies as Raisely's" };
    }
    const api = (body.components ?? []).find((c) => c.id === API_COMPONENT_ID);
    if (!api) return { state: "unknown", message: "Status page no longer lists the API component" };

    const state = mapComponentStatus(api.status);
    const openIncidents = body.incidents?.length ?? 0;
    const notes: string[] = [];
    if (state !== "ok") notes.push(`API: ${api.status}`);
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components: { [API_COMPONENT_ID]: { state, message: "API" } },
      ttlSeconds: 60,
    };
  },
};

export default service;
