import type { HealthCheckDefinition, HealthState } from "@w6w/types";

/**
 * Is Reddit's platform up? Reddit runs an Atlassian-Statuspage-backed status
 * page at `redditstatus.com` (same backend as `www.githubstatus.com`), with
 * a documented JSON API — `GET /api/v2/summary.json` returned a live,
 * well-formed response with 12 components (Desktop Web, Mobile Web, Native
 * Mobile Apps, reddit.com, Reddit Ads, Reddit Infrastructure, Vote
 * Processing, Comment Processing, Spam Processing, Modmail, Reddit Media
 * Storage, ads.reddit.com) when checked 2026-07-31. Unlike X (see the
 * `twitter` app in this pack), this is a real machine-readable feed, so it
 * gets a real probe rather than a declared absence.
 *
 * `www.redditstatus.com` is a status host, not an API host — it must not go
 * in `w6w.network.allow` (would widen egress for every action to satisfy
 * one hook), so it's declared here instead, scoped to just this check's
 * worker, per rfcs/healthcheck.md "Status hosts are not API hosts".
 */
const STATUS_URL = "https://www.redditstatus.com/api/v2/summary.json";

interface StatuspageSummary {
  status: { indicator: "none" | "minor" | "major" | "critical"; description: string };
  components: Array<{ id: string; name: string; status: string }>;
}

function mapIndicator(indicator: StatuspageSummary["status"]["indicator"]): HealthState {
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

/** Statuspage's per-component enum: operational | degraded_performance | partial_outage | major_outage. */
function mapComponentStatus(status: string): HealthState {
  if (status === "operational") return "ok";
  if (status === "major_outage") return "down";
  if (status === "degraded_performance" || status === "partial_outage") return "degraded";
  return "unknown";
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Reddit platform status",
  description: "GET https://www.redditstatus.com/api/v2/summary.json (Statuspage.io feed).",
  kind: "service",
  scope: "app",
  credential: "none",
  severity: "degraded",
  minIntervalSeconds: 60,
  network: { allow: ["www.redditstatus.com"] },

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL);
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };
    const body = await res.json() as StatuspageSummary;

    return {
      state: mapIndicator(body.status.indicator),
      message: body.status.description,
      components: Object.fromEntries(
        body.components.map((c) => [c.name, { state: mapComponentStatus(c.status) }]),
      ),
      ttlSeconds: 60,
    };
  },
};

export default service;
