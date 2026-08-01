/**
 * Is Splunk Cloud Platform up? — read from the vendor's own JSON status API.
 *
 * `status.splunkcloud.com` is a Statuspage.io-hosted page (verified live:
 * `GET https://status.splunkcloud.com/api/v2/summary.json` returns
 * `{ status: { indicator, description }, components: [{ id, name, status }, …] }`
 * using Statuspage's standard vocabulary — `operational` / `degraded_performance`
 * / `partial_outage` / `major_outage` / `under_maintenance`). That is a
 * genuine "current state" API, not a log of past updates, so this check reads
 * it directly rather than declaring `feed` — no incident-prose parsing needed.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — a different question from "is this credential live"
 *     (the derived `auth:token` check) or "is there quota left" (not declared
 *     here — see README for why).
 *   - `scope: "app"` (the default for this kind) — identical for every
 *     Connection, so the host runs it once and shares the result.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected.
 *   - No `network.allow` is declared: `status.splunkcloud.com` already falls
 *     under the app's own `*.splunkcloud.com` wildcard (required regardless,
 *     to address per-tenant stacks), so widening is unnecessary here — unlike
 *     the usual case where a status host sits outside the app's API domain
 *     entirely.
 *
 * One call, several components: Splunk Cloud's summary lists components such
 * as "Ingest Processor", "Login" and "Index" independently, so an incident
 * confined to one need not grey out the whole platform.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

const STATUS_HOST = "status.splunkcloud.com";

/** Statuspage.io's overall `status.indicator` vocabulary. */
function overallState(indicator: string): HealthState {
  switch (indicator) {
    case "none":
      return "ok";
    case "minor":
      return "degraded";
    case "major":
    case "critical":
      return "down";
    default:
      return "unknown";
  }
}

/** Statuspage.io's per-component `status` vocabulary. */
function componentState(status: string): HealthState {
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
  title: "Splunk Cloud Platform status",
  description:
    `Statuspage.io summary from https://${STATUS_HOST} — overall indicator plus per-component state.`,
  kind: "service",
  covers: ["*"],

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => null) as {
      status?: { indicator?: string; description?: string };
      components?: Array<{ id?: string; name?: string; status?: string }>;
    } | null;
    if (!body?.status?.indicator) return { state: "unknown", message: "malformed status response" };

    const components: Record<string, HealthComponentReport> = {};
    for (const c of body.components ?? []) {
      if (!c.name || !c.status) continue;
      const id = c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (id) components[id] = { state: componentState(c.status) };
    }

    return {
      state: overallState(body.status.indicator),
      message: body.status.description,
      ...(Object.keys(components).length > 0 ? { components } : {}),
      ttlSeconds: 120,
    };
  },
};

export default service;
