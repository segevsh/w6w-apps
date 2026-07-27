/**
 * Is Todoist up? — Instatus status page.
 *
 * Todoist does not run Atlassian Statuspage; `status.todoist.com` 302s to
 * `status.todoist.net`, an Instatus page. Instatus exposes a machine-readable
 * rollup at `/summary.json` whose `page.status` is a single enum
 * (`UP` / `HASISSUES` / `UNDERMAINTENANCE`), plus optional `activeIncidents`
 * and `activeMaintenances` arrays when something is open. We probe the JSON
 * rather than the RSS/Atom history feed because the question here is current
 * state, and a feed is a log of updates — the mistral trap.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — "is the vendor's platform up", a different question
 *     from "is this credential live" (the derived `auth:*` check) or "is there
 *     quota left" (`quota`).
 *   - `scope: "app"` (the default for this kind) — the answer is identical for
 *     every Connection, so the host runs it once and shares the result.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected.
 *   - `network.allow` — status.todoist.net is deliberately NOT on the app's
 *     egress allowlist; an action has no business calling it. The allowlist is
 *     widened for this one hook only, which the spec permits precisely because
 *     the posture is unsigned: a signed request must never reach a status host.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
 *     never hard-fails a target on its own.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

/** Instatus's overall-page vocabulary. */
const PAGE: Record<string, HealthState> = {
  UP: "ok",
  HASISSUES: "degraded",
  UNDERMAINTENANCE: "degraded",
};

/**
 * Instatus's per-incident impact vocabulary. An outage-level impact is `down`;
 * a degradation or maintenance is `degraded`. An unrecognised value falls back
 * to `degraded` — under-reporting an incident is the worse failure.
 */
const IMPACT: Record<string, HealthState> = {
  OPERATIONAL: "ok",
  DEGRADEDPERFORMANCE: "degraded",
  PARTIALOUTAGE: "degraded",
  MINOROUTAGE: "degraded",
  MAJOROUTAGE: "down",
  UNDERMAINTENANCE: "degraded",
};

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const STATUS_HOST = "status.todoist.net";

interface Incident {
  name?: string;
  impact?: string;
  url?: string;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Todoist platform status",
  description:
    "Instatus rollup for status.todoist.net (/summary.json): overall `page.status` plus any open incidents. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about Todoist, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      page?: { status?: string };
      activeIncidents?: Incident[];
      activeMaintenances?: Incident[];
    };

    const pageState = PAGE[body.page?.status ?? ""] ?? "unknown";

    // Attribute open incidents to components so one degraded service does not
    // grey out the whole platform.
    const open = [...(body.activeIncidents ?? []), ...(body.activeMaintenances ?? [])];
    const components: Record<string, HealthComponentReport> = {};
    const states: HealthState[] = [pageState];
    for (const inc of open) {
      const state = IMPACT[(inc.impact ?? "").toUpperCase()] ?? "degraded";
      states.push(state);
      const id = slug(inc.name ?? "");
      if (id) components[id] = { state, message: inc.name };
    }

    const worst = states.includes("down")
      ? "down"
      : states.includes("degraded")
      ? "degraded"
      : pageState;

    return {
      state: worst,
      message: open.length > 0 ? open.map((i) => i.name).filter(Boolean).join("; ") : undefined,
      ...(Object.keys(components).length > 0 ? { components } : {}),
      ttlSeconds: 60,
    };
  },
};

export default service;
