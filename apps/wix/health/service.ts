/**
 * Is Wix up? — Atlassian Statuspage at status.wix.com.
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
 *   - `network.allow` — status.wix.com is deliberately NOT on the app's egress
 *     allowlist; an action has no business calling it. The allowlist is widened
 *     for this one hook only, which the spec permits precisely because the
 *     posture is unsigned: a signed request must never reach a third-party
 *     status host.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
 *     never hard-fails a target on its own.
 *
 * ## Verified genuine, both ways, 2026-08-03
 *
 * A status endpoint is worth probing only if it is really the vendor's. Both
 * checks were run:
 *
 *   (a) **Bogus sibling comparison.** `https://status.wix.com/api/v2/status.json`
 *       returns 200 while `https://status.wix.com/totally-bogus-sibling-path.json`
 *       returns 404 with an empty body — the host discriminates paths rather
 *       than serving one catch-all page.
 *   (b) **Content-type and body inspection.** The response is
 *       `application/json` (not a 127 KB `text/html` marketing page), 206 bytes
 *       for `status.json`, and its `page` object self-identifies as
 *       `{"id":"3x6vjqhj2cpt","name":"Wix","url":"https://status.wix.com"}`.
 *       `summary.json` carries 119 real components — Wix Editor, Wix Payments,
 *       Automations, Dashboard, Storefront, Site Loading and so on.
 *
 * ## `summary.json`, and the duplicate-name problem it brings
 *
 * `summary.json` rather than `status.json`: the same single request, but it
 * carries the per-component breakdown, which for a platform this broad is the
 * whole point — a workflow driving the CMS can be perfectly healthy while the
 * Wix Editor is down, and vice versa.
 *
 * The cost is that Wix's 119 components are **not uniquely named**. "Player",
 * "Management and Settings" and "Management & Settings" each appear under
 * several product groups. Slugging on the leaf name alone — which is fine for a
 * vendor with six components — would silently collapse those onto one key and
 * report one product's outage under another product's name. So group headers
 * are resolved to their names first and each component is keyed
 * `<group>-<component>`, with a numeric suffix as a last-resort tiebreak. The
 * result is stable and never loses a component.
 *
 * A `feed` was considered and rejected: Wix does publish Atom and RSS at
 * `/history.atom` and `/history.rss`, but an incident *history* feed says
 * nothing about the 119 components' current state, which is the useful signal
 * here. The summary API gives current state directly.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

/**
 * Statuspage's four rollup indicators. `major`/`critical` map to `down`; the
 * roll-up caps a `service` check at `degraded` anyway (that is this kind's
 * severity default), so the distinction is purely what an operator sees.
 */
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

const STATUS_HOST = "status.wix.com";

interface StatuspageComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
  group_id?: string | null;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Wix platform status",
  description:
    "Atlassian Statuspage rollup for status.wix.com, with per-component detail across the Wix product surface (Editor, Dashboard, Payments, Storefront, Automations, …). Unauthenticated and unsigned.",
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
      components?: StatuspageComponent[];
    };

    const all = body.components ?? [];

    // Group headers restate their children's worst state, so they are not
    // reported themselves — but their names are needed to disambiguate the
    // children, which is why they are indexed before being skipped.
    const groupNames = new Map<string, string>();
    for (const c of all) {
      if (c.group && c.id && c.name) groupNames.set(c.id, c.name);
    }

    const components: Record<string, { state: HealthState }> = {};
    for (const c of all) {
      if (!c.name || c.group) continue;
      const group = c.group_id ? groupNames.get(c.group_id) : undefined;
      const base = slug(group ? `${group} ${c.name}` : c.name);
      // Wix reuses leaf names across groups; never let one overwrite another.
      let key = base;
      for (let n = 2; key in components; n++) key = `${base}-${n}`;
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
