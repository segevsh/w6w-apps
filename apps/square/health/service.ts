/**
 * Is Square up? — `issquareup.com`, Square's own status page.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — this answers "is the vendor's platform up", a
 *     different question from "is this credential live" (the derived `auth:*`
 *     check) and from "is there quota left" (`quota`).
 *   - `scope: "app"` (this kind's default) — the answer is identical for every
 *     Connection, so the host runs it once and shares the result. It also spans
 *     both environments: Square publishes no separate sandbox status.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected.
 *   - `network.allow` — `issquareup.com` is deliberately NOT on the app's egress
 *     allowlist; an action has no business calling it. The allowlist is widened
 *     for this one hook, which the spec permits precisely because the posture is
 *     unsigned.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
 *     never hard-fails a target on its own.
 *
 * ## Verifying the endpoint is real
 *
 * Square's status page is `issquareup.com` (not `status.squareup.com`, which
 * does not resolve to a usable TLS endpoint at all) and it is linked from
 * developer.squareup.com. It serves a Statuspage-shaped JSON API, and that was
 * checked rather than assumed on 2026-08-03 — an HTML catch-all will happily
 * return 200 for any path you invent:
 *
 *   - `GET /api/v2/status.json` -> 200 `application/json`, 199 bytes:
 *     `{"page":{"id":"01KA8HXZG84ZKV47J5B48Q10ZA","name":"Square",
 *       "url":"https://issquareup.com/","updated_at":"..."},
 *       "status":{"description":"All Systems Operational","indicator":"none"}}`
 *   - `GET /api/v2/definitely-not-a-real-endpoint.json` -> **404**, empty body.
 *
 * Different status, different content-type, different body: a real route, not a
 * catch-all. Two further findings shaped this check:
 *
 *   - `/api/v2/summary.json` also answers 200 JSON, but its `components` array
 *     is **empty** — Square publishes a single rollup and no per-component
 *     breakdown. So this probe reads `status.json` (the smaller payload) and
 *     reports no `components`, rather than pretending to a detail that is not
 *     published.
 *   - `/api/v2/incidents/unresolved.json` returns a Next.js HTML error page, and
 *     `/history.rss` and `/history.atom` both 404 — so there is no feed to
 *     declare via `feed:` and no incident list to enumerate. The rollup
 *     indicator is the whole of what Square makes machine-readable.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

/**
 * Statuspage's four rollup indicators. `major` maps to `down` rather than
 * `degraded`; the roll-up caps it at `degraded` anyway (severity defaults to
 * `degraded` for kind `service`), so the distinction is what an operator sees.
 */
const INDICATOR: Record<string, HealthState> = {
  none: "ok",
  minor: "degraded",
  major: "down",
  critical: "down",
};

const STATUS_HOST = "issquareup.com";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Square platform status",
  description:
    "Rollup indicator from Square's own status page at issquareup.com. Unauthenticated and unsigned; covers both the production and sandbox hosts.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/status.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: { indicator?: string; description?: string };
    };

    return {
      state: INDICATOR[body.status?.indicator ?? ""] ?? "unknown",
      message: body.status?.description,
      ttlSeconds: 60,
    };
  },
};

export default service;
