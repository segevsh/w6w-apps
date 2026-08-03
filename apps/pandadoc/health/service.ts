/**
 * Is PandaDoc up? — Atlassian Statuspage.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — "is the vendor's platform up", a different question
 *     from "is this credential live" (the derived `auth:*` check) and from "is
 *     there quota left" (`quota`).
 *   - `scope: "app"` (this kind's default) — the answer is identical for every
 *     Connection, so the host runs it once and shares the result.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected.
 *   - `network.allow` — `status.pandadoc.com` is deliberately NOT on the app's
 *     egress allowlist; an action has no business calling it. The allowlist is
 *     widened for this one hook only, which the spec permits precisely because
 *     the posture is unsigned.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
 *     never hard-fails a target on its own.
 *
 * ## The page is real, and that was checked rather than assumed
 *
 * A Statuspage-shaped URL is not evidence of a Statuspage: several vendors
 * serve an HTML catch-all for every unknown path, so `/api/v2/summary.json`
 * "works" and returns something byte-identical to what a nonsense path returns.
 * Verified live on 2026-08-03 against a deliberate control:
 *
 * ```
 * GET status.pandadoc.com/api/v2/summary.json          -> 200 application/json, 23210 bytes
 * GET status.pandadoc.com/api/v2/nonsense-does-not-exist.json -> 404, 0 bytes
 * ```
 *
 * Different status, different content type, different size — a real Statuspage,
 * page id `gcs4ryzm3qt6`, name "PandaDoc". `summary.json` rather than
 * `status.json`: the same single request, but it carries the per-component
 * breakdown.
 *
 * ## Why component names are namespaced by their group
 *
 * PandaDoc's page splits into two component **groups**, "US & Global" and "EU",
 * each carrying the *same* component names (Creating and editing documents,
 * Sending documents, Uploading documents, Public (recipient) view, Signup,
 * CRMs & Integrations, API, Webhooks, Web application, Mobile application,
 * Website, Downloading documents). Slugging by bare name — the obvious approach,
 * and the one most apps in this pack can get away with — would collapse each
 * pair into one key and let whichever region came last silently win. So each
 * leaf is reported as `<group>/<component>` (`us-global/api`, `eu/api`), and a
 * component with no group keeps its bare slug. Data residency means an account
 * lives in exactly one of those regions, and PandaDoc publishes no way for the
 * API to say which, so both are reported and the rollup indicator carries the
 * verdict.
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

const STATUS_HOST = "status.pandadoc.com";

interface Component {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
  group_id?: string | null;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "PandaDoc platform status",
  description:
    "Atlassian Statuspage rollup for status.pandadoc.com, with per-component detail namespaced by region group. Unauthenticated and unsigned.",
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
      components?: Component[];
    };

    const all = body.components ?? [];
    // Group headers restate their children's worst state — used only to name
    // the children, never reported themselves.
    const groupName = new Map<string, string>();
    for (const c of all) {
      if (c.group && c.id && c.name) groupName.set(c.id, slug(c.name));
    }

    const components: Record<string, { state: HealthState }> = {};
    for (const c of all) {
      if (!c.name || c.group) continue;
      const parent = c.group_id ? groupName.get(c.group_id) : undefined;
      const key = parent ? `${parent}/${slug(c.name)}` : slug(c.name);
      components[key] = { state: COMPONENT[c.status ?? ""] ?? "unknown" };
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
