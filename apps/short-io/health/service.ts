import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

/**
 * Is Short.io up? — `shortiostatus.com`, verified 2026-10-06.
 *
 * ## It is neither Statuspage nor Better Stack
 *
 * The page is a **cState** site (a Hugo theme, `cStateVersion` 6.0.1) served from
 * GitHub Pages. `/api/v2/summary.json`, `/history.atom` and `/feed.rss` all 404
 * (an HTML 404 page, 12,540 bytes), so the Statuspage and Atom conventions do not
 * apply. The machine-readable surface is `/index.json`:
 *
 *     {"is":"index","title":"Short.io Status","summaryStatus":"ok",
 *      "systems":[{"name":"Redirects","status":"ok"},{"name":"API","status":"ok"},
 *                 {"name":"Dashboard",…},{"name":"Landing page",…},
 *                 {"name":"Statistics (EU)",…},{"name":"Statistics (US)",…}]}
 *
 * ## Which field to trust
 *
 * There IS a component named `API`, so the verdict comes from it rather than
 * from `summaryStatus` — the roll-up would let the marketing landing page speak
 * for the API. The other systems are still reported as components. cState's
 * status vocabulary is `ok` / `notice` / `disrupted` / `down`; only `ok` has
 * been observed live, the rest are cState's documented values, and anything
 * unrecognised becomes `unknown` rather than being read as healthy.
 *
 * `credential: "none"` and the per-hook `network.allow`: the status host is not
 * an API host and is deliberately absent from the app's own allowlist.
 */
const STATUS_HOST = "shortiostatus.com";
export const STATUS_URL = `https://${STATUS_HOST}/index.json`;

export const STATE: Record<string, HealthState> = {
  ok: "ok",
  notice: "degraded",
  disrupted: "degraded",
  down: "down",
};

export function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

interface CState {
  is?: string;
  title?: string;
  summaryStatus?: string;
  systems?: Array<{ name?: string; status?: string }>;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Short.io platform status",
  description:
    "cState status page at shortiostatus.com: the API component decides the verdict; Redirects, " +
    "Dashboard, Landing page and Statistics are reported as components. Unauthenticated.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as CState | null;
    if (!body) return { state: "unknown", message: "status page did not return JSON" };
    // Self-identification: a cState index for Short.io.
    if (body.is !== "index" || !/short\.?io/i.test(body.title ?? "")) {
      return { state: "unknown", message: "status page no longer self-identifies as Short.io's" };
    }

    const components: Record<string, HealthComponentReport> = {};
    let api: HealthState | undefined;
    for (const sys of body.systems ?? []) {
      if (!sys.name) continue;
      const state = STATE[sys.status ?? ""] ?? "unknown";
      components[slug(sys.name)] = state === "ok"
        ? { state, message: sys.name }
        : { state, message: `${sys.name}: ${sys.status ?? "no status"}` };
      if (slug(sys.name) === "api") api = state;
    }
    if (api === undefined) {
      return { state: "unknown", message: "status page has no API component", components };
    }
    const affected = Object.values(components).filter((c) => c.state !== "ok");
    return {
      state: api,
      message: affected.length > 0
        ? `affected: ${affected.map((c) => c.message).join(", ")}`
        : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
