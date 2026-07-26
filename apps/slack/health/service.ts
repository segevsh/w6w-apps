/**
 * Is Slack up? — Slack runs its own status API rather than Statuspage.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — this answers "is the vendor's platform up", which is a
 *     different question from "is this credential live" (the derived `auth:*`
 *     check).
 *   - `scope: "app"` (the default for this kind) — the answer is identical for
 *     every Connection, so the host runs it once and shares the result.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected.
 *   - `network.allow` — status.slack.com is deliberately NOT on the app's egress
 *     allowlist (`slack.com` is the API host; the status host is a different
 *     name). The allowlist is widened for this one hook only, which the spec
 *     permits precisely because the posture is unsigned.
 *   - `severity` defaults to `degraded` for this kind, so a Slack incident never
 *     hard-fails a target on its own.
 *
 * Slack reports open incidents rather than a single rollup indicator, and each
 * incident names the surfaces it affects — so one call reports many components,
 * which is the point of a report over a boolean. A `notice` is Slack's label
 * for "we are telling you something", not "something is broken", so it does not
 * degrade the state.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

const STATUS_HOST = "status.slack.com";

/** Slack's incident types, worst-case mapped onto our four states. */
const TYPE: Record<string, HealthState> = {
  outage: "down",
  incident: "degraded",
  notice: "ok",
};

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "Slack platform status",
  description:
    "Slack's own status API. Reports each open incident and the surfaces it affects. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2.0.0/current`);
    // `unknown`, never `down`: a status API that itself fails tells us nothing
    // about Slack, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: string;
      active_incidents?: Array<{ title?: string; type?: string; services?: string[] }>;
    };

    const incidents = body.active_incidents ?? [];
    if (incidents.length === 0) {
      return { state: "ok", ttlSeconds: 60 };
    }

    const components: Record<string, { state: HealthState; message?: string }> = {};
    const states: HealthState[] = [];
    for (const incident of incidents) {
      const state = TYPE[incident.type ?? ""] ?? "degraded";
      states.push(state);
      for (const svc of incident.services ?? []) {
        // Worst incident wins per surface: two incidents can name the same one.
        const id = slug(svc);
        const existing = components[id]?.state;
        components[id] = {
          state: existing ? worstHealthState([existing, state]) : state,
          message: incident.title,
        };
      }
    }

    return {
      state: worstHealthState(states),
      message: incidents.map((i) => i.title).filter(Boolean).join("; ") || undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
