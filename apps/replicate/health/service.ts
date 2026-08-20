/**
 * Is Replicate up? — its own Statuspage.
 *
 * Verified 2026-08-18: `status.replicate.com/api/v2/status.json` answers 211
 * bytes of real `application/json`. Worth checking rather than assuming — two
 * of the status surfaces probed while building this batch returned HTTP 200 for
 * *every* path because they are single-page apps with a catch-all route.
 *
 * The components are read rather than the page's overall indicator, so that an
 * outage in something this app does not call — the website, the CDN that serves
 * model output files — does not report as this app being down.
 *
 * Annotation:
 *
 *   - `kind: "service"`, `scope: "app"` (default), `credential: "none"`
 *     (default) — one unauthenticated answer shared by every Connection.
 *   - `network.allow` — `status.replicate.com` is not the API host and is
 *     deliberately absent from the app's own egress allowlist.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

const STATUS_HOST = "status.replicate.com";

/** Anything whose name says API or prediction is what this app rides on. */
const WANTED = /\b(api|predictions?|inference|models?)\b/i;

const STATES: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  under_maintenance: "degraded",
  major_outage: "down",
};

interface Component {
  name?: string;
  status?: string;
  group?: boolean;
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "Replicate platform status",
  description:
    "The API and prediction components on Replicate's own status page. Unauthenticated and " +
    "unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/components.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as { components?: Component[] } | null;
    if (!Array.isArray(body?.components)) {
      return { state: "unknown", message: "status page returned an unexpected shape" };
    }

    // `group: true` rows roll up components this app may not use.
    const watched = body.components.filter((c) => c.group !== true && WANTED.test(String(c.name)));
    if (watched.length === 0) {
      return {
        state: "unknown",
        message: "the status page names no API or prediction components",
      };
    }

    const components: Record<string, { state: HealthState; message?: string }> = {};
    for (const c of watched) {
      components[slug(String(c.name))] = {
        state: STATES[String(c.status)] ?? "unknown",
        message: c.status,
      };
    }
    const bad = watched.filter((c) => c.status !== "operational");
    return {
      state: worstHealthState(Object.values(components).map((c) => c.state)),
      message: bad.length === 0
        ? `${watched.length} components operational`
        : bad.map((c) => `${c.name}: ${c.status}`).join("; "),
      components,
      ttlSeconds: 120,
    };
  },
};

export default service;
