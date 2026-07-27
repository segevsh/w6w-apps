/**
 * Is ClickUp up? — Status.io rollup.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — this answers "is the vendor's platform up", which is a
 *     different question from "is this credential live" (the derived `auth:*`
 *     check) or "is there quota left" (`quota`).
 *   - `scope: "app"` (the default for this kind) — the answer is identical for
 *     every Connection, so the host runs it once and shares the result. Running
 *     it per Connection would multiply one useful call by the number of users
 *     and is a good way to get rate-limited by a status page.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected.
 *   - `network.allow` — api.status.io is deliberately NOT on the app's egress
 *     allowlist; an action has no business calling it. The allowlist is widened
 *     for this one hook only, which the spec permits precisely because the
 *     posture is unsigned: a signed request must never reach a third-party
 *     status host.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
 *     never hard-fails a target on its own.
 *
 * Unlike the Atlassian pack (github/stripe/trello), ClickUp's status page runs
 * on **Status.io**, not Statuspage — there is no `/api/v2/summary.json`. The
 * machine-readable surface is Status.io's own JSON rollup, keyed by the page's
 * public id (`5b6e0963c662144d00913a09`, read off status.clickup.com). It
 * carries a `status_overall` code plus a per-service `status[]` array, so this
 * is one probe reporting many components.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

/**
 * Status.io's numeric status codes (shared by the overall rollup and each
 * component). 100 is the only healthy value; a maintenance window is surfaced
 * as `degraded` rather than hidden, and a full disruption/security event as
 * `down`. An unrecognised code is `unknown`, never `ok` — under-reporting an
 * outage is the worse failure.
 */
const CODE: Record<number, HealthState> = {
  100: "ok", // Operational
  200: "degraded", // Planned Maintenance
  300: "degraded", // Degraded Performance
  400: "degraded", // Partial Service Disruption
  500: "down", // Service Disruption
  600: "down", // Security Event
};

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const STATUS_HOST = "api.status.io";
const STATUS_ID = "5b6e0963c662144d00913a09";

const service: HealthCheckDefinition = {
  key: "service",
  title: "ClickUp platform status",
  description:
    "Status.io rollup for status.clickup.com, with per-service detail. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/1.0/status/${STATUS_ID}`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      result?: {
        status_overall?: { status?: string; status_code?: number };
        status?: Array<{ name?: string; status?: string; status_code?: number }>;
      };
    };
    const result = body.result;
    if (!result?.status_overall) {
      return { state: "unknown", message: "status payload missing status_overall" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const c of result.status ?? []) {
      if (!c.name || c.status_code === undefined) continue;
      const state = CODE[c.status_code] ?? "unknown";
      // Only surface components that are not fully operational — an all-green
      // report of 22 services is noise.
      if (state !== "ok") components[slug(c.name)] = { state, message: c.status };
    }

    const overall = CODE[result.status_overall.status_code ?? -1] ?? "unknown";
    return {
      state: overall,
      message: result.status_overall.status,
      ...(Object.keys(components).length > 0 ? { components } : {}),
      ttlSeconds: 60,
    };
  },
};

export default service;
