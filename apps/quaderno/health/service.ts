/**
 * Is Quaderno's API up?
 *
 * Status page: `quaderno.statuspage.io`, an Atlassian Statuspage (checked
 * 2026-10-06). Verified three ways: (a) the body is the Statuspage v2 schema
 * (`page`, `components`, `incidents`, `status.indicator`), not an unclaimed
 * ~127 KB HTML decoy; (b) `page.name` is `Quaderno`; (c) it has exactly two
 * components — `Quaderno Web Application` and `Quaderno APIs` (id
 * `hqy8fjhlb31h`). The verdict is read from `Quaderno APIs` only: the web app
 * being degraded does not mean this app's API calls fail.
 *
 * The status host is NOT an API host, so it is allowlisted for this check
 * alone (`network.allow` on the hook), never in the manifest.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

export const STATUS_URL = "https://quaderno.statuspage.io/api/v2/summary.json";
export const API_COMPONENT_ID = "hqy8fjhlb31h";

interface Summary {
  page?: { name?: string };
  components?: Array<{ id?: string; name?: string; status?: string }>;
  incidents?: unknown[];
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
  title: "Quaderno API status",
  description: "The `Quaderno APIs` component on quaderno.statuspage.io.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["quaderno.statuspage.io"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };
    const body = await res.json().catch(() => null) as Summary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };
    if (body.page?.name !== "Quaderno") {
      return { state: "unknown", message: "status page no longer self-identifies as Quaderno's" };
    }
    const api = (body.components ?? []).find((c) =>
      c.id === API_COMPONENT_ID || c.name === "Quaderno APIs"
    );
    if (!api) return { state: "unknown", message: "no `Quaderno APIs` component on the page" };
    const state = mapComponentStatus(api.status);
    return {
      state,
      message: state === "ok" ? undefined : `${api.name}: ${api.status}`,
      components: { [api.id ?? "api"]: { state, message: api.name } },
      ttlSeconds: 60,
    };
  },
};

export default service;
