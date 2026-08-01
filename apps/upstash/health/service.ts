/**
 * Is the Upstash platform up?
 *
 * status.upstash.com is a real Atlassian Statuspage instance with a JSON
 * summary API (verified live 2026-07-31):
 *
 *   GET https://status.upstash.com/api/v2/summary.json
 *   -> { status: { indicator, description }, components: [...] }
 *
 * `status.indicator` is the page-wide verdict ("none" | "minor" | "major" |
 * "critical"). `components` lists 36 entries — one per region plus four
 * component GROUPS ("Redis Global", "Redis Regional", "Vector", "QStash"),
 * marked `group: true` with their own rolled-up `status`. Reporting all 36
 * would mostly duplicate information (16 near-identical Redis Global
 * regions) and re-derive what the four group entries already summarize, so
 * `components` here reports just those four.
 *
 * `kind: "service"` defaults `scope` to `"app"` (one call, shared across
 * every Connection) and `credential` to `"none"` — correct here: the status
 * page needs no token and answering it per-Connection would multiply one
 * call by every user for no extra information.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const STATUS_URL = "https://status.upstash.com/api/v2/summary.json";

/** Atlassian Statuspage's page-wide indicator vocabulary. */
function mapIndicator(indicator: string): HealthState {
  switch (indicator) {
    case "none":
      return "ok";
    case "minor":
    case "major":
      return "degraded";
    case "critical":
      return "down";
    default:
      return "unknown";
  }
}

/** Atlassian Statuspage's per-component status vocabulary. */
function mapComponentStatus(status: string): HealthState {
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
  title: "Upstash platform status",
  description: "status.upstash.com's JSON summary — Redis, Vector and QStash across every region.",
  kind: "service",
  covers: ["*"],
  network: { allow: ["status.upstash.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL);
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json() as {
      status: { indicator: string; description: string };
      components: Array<{ id: string; name: string; status: string; group: boolean }>;
    };

    const groups = body.components.filter((c) => c.group);
    return {
      state: mapIndicator(body.status.indicator),
      message: body.status.description,
      components: Object.fromEntries(
        groups.map((c) => [c.id, { state: mapComponentStatus(c.status), message: c.name }]),
      ),
      ttlSeconds: 60,
    };
  },
};

export default service;
