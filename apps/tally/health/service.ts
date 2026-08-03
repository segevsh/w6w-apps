/**
 * Is Tally up? — Better Stack status page.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — this answers "is the vendor's platform up", a
 *     different question from "is this credential live" (the derived `auth:*`
 *     check) and from "is there quota left" (`quota`).
 *   - `scope: "app"` (the default for this kind) — one host, one answer, shared
 *     across every Connection.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected.
 *   - `network.allow` — `status.tally.so` is deliberately NOT on the app's
 *     egress allowlist; no action has business calling it. The allowlist is
 *     widened for this one hook, which the spec permits precisely because the
 *     posture is unsigned.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
 *     never hard-fails a target on its own.
 *
 * ## Why `index.json` and not the RSS feed
 *
 * Tally's status page is **Better Stack**, not Atlassian Statuspage, so there
 * is no `/api/v2/summary.json` (verified 2026-08-03: that path falls through to
 * the page's HTML catch-all, byte-identical to a nonsense path). Two real
 * sources exist:
 *
 *   - `https://status.tally.so/feed.rss` — a genuine RSS feed
 *     (`application/rss+xml`), which the spec's `feed` declaration could parse
 *     for free.
 *   - `https://status.tally.so/index.json` — the page's own JSON, carrying
 *     `data.attributes.aggregate_state` plus a `status_page_resource` per
 *     component (live: `Tally Application`, `Tally API`, `Custom domains`).
 *
 * `index.json` wins, and the reason is the same one the spec gives for
 * preferring `latest` over `entries`: **a feed is a log of updates, not a
 * statement of current state.** Better Stack emits paired
 * "X went down" / "X recovered" items sharing one `guid`, so reading current
 * health off it means inferring state from title text. `aggregate_state` *is*
 * the current state, and the per-resource breakdown names the API separately
 * from the app — which is what a caller of this integration actually cares
 * about. One request either way.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const STATUS_HOST = "status.tally.so";

/**
 * Better Stack's resource/aggregate vocabulary. `maintenance` maps to
 * `degraded` rather than `down` — planned work is not an outage, but it is not
 * business-as-usual either.
 */
const STATE: Record<string, HealthState> = {
  operational: "ok",
  degraded: "degraded",
  downtime: "down",
  maintenance: "degraded",
};

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

interface StatusPayload {
  data?: { attributes?: { aggregate_state?: string } };
  included?: Array<{
    type?: string;
    attributes?: { public_name?: string; status?: string; explicit_status?: string | null };
  }>;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Tally platform status",
  description:
    "Better Stack status page for status.tally.so: the aggregate state plus per-component detail (Tally Application, Tally API, Custom domains). Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/index.json`, {
      headers: { accept: "application/json" },
    });
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as StatusPayload;

    const components: Record<string, { state: HealthState }> = {};
    for (const entry of body.included ?? []) {
      if (entry.type !== "status_page_resource") continue;
      const name = entry.attributes?.public_name;
      if (!name) continue;
      // `explicit_status` is an operator override; it wins over the measured one.
      const raw = entry.attributes?.explicit_status ?? entry.attributes?.status ?? "";
      components[slug(name)] = { state: STATE[raw] ?? "unknown" };
    }

    const aggregate = body.data?.attributes?.aggregate_state;
    return {
      state: STATE[aggregate ?? ""] ?? "unknown",
      message: aggregate,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
