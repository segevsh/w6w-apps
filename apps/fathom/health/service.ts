/**
 * Is Fathom up? — Atlassian Statuspage at `status.fathom.video`.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — this answers "is the vendor's platform up", a different
 *     question from "is this credential live" (the derived `auth:*` check) and
 *     from "is there rate-limit headroom" (`quota`).
 *   - `scope: "app"` (this kind's default) — the answer is identical for every
 *     Connection, so the host runs it once and shares the result. Fathom serves
 *     one API host worldwide, so there is nothing regional to split.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected.
 *   - `network.allow` — `status.fathom.video` is deliberately NOT on the app's
 *     egress allowlist; an Action has no business calling it. The allowlist is
 *     widened for this one hook only, which the spec permits precisely because
 *     the posture is unsigned.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident never
 *     hard-fails a target on its own.
 *
 * **The page was verified real, not assumed.** `status.fathom.video` answers with
 * `x-statuspage-version` and `<title>Fathom Video Status</title>`, and
 * `/api/v2/summary.json` returns JSON whose `page.name` is "Fathom Video"
 * (page id `h4b8ylf20013`), with components including "In-Call Processing (Zoom)"
 * and "Google Calendar Sync". A deliberately bogus sibling path
 * (`/api/v2/nonsense-zzz.json`) answers **404 with an empty body** rather than
 * the same payload — so this is a real Statuspage API, not an HTML catch-all
 * masquerading as one. Verified live 2026-08-03.
 *
 * `summary.json` rather than `status.json`: the same single request, but it also
 * carries the per-component breakdown, so one probe reports many things.
 *
 * A `feed` was considered — Statuspage publishes `/history.atom` — and rejected:
 * the JSON API states CURRENT component state directly, whereas an incident feed
 * is a log of updates that has to be folded back into a present-tense verdict.
 * Where the vendor answers the question outright, ask it outright.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

/** Statuspage's four rollup indicators. */
const INDICATOR: Record<string, HealthState> = {
  none: "ok",
  minor: "degraded",
  major: "down",
  critical: "down",
};

/** Statuspage's per-component vocabulary. */
const COMPONENT: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const STATUS_HOST = "status.fathom.video";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Fathom platform status",
  description:
    "Atlassian Statuspage rollup for status.fathom.video, with per-component detail. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: { indicator?: string; description?: string };
      components?: Array<{ name?: string; status?: string; group?: boolean }>;
    };

    const components: Record<string, { state: HealthState }> = {};
    for (const c of body.components ?? []) {
      // Skip group headers — they restate their children's worst state.
      if (!c.name || c.group) continue;
      components[slug(c.name)] = { state: COMPONENT[c.status ?? ""] ?? "unknown" };
    }

    return {
      state: INDICATOR[body.status?.indicator ?? ""] ?? "unknown",
      message: body.status?.description,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
