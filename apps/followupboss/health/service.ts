/**
 * Is Follow Up Boss up? — Atlassian Statuspage.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — answers "is the vendor's platform up", a different
 *     question from "is this credential live" (the derived `auth:*` check) or
 *     "is there quota left" (`quota`).
 *   - `scope: "app"` (this kind's default) — the answer is identical for every
 *     Connection, so the host runs it once and shares it. Per-Connection would
 *     multiply one useful call by the number of users and is a good way to get
 *     rate-limited by a status page.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected, and
 *     a third-party status host never sees a Follow Up Boss API key.
 *   - `network.allow` — followupboss.statuspage.io is deliberately NOT on the
 *     app's egress allowlist; an action has no business calling it. The
 *     allowlist is widened for this one hook, which the spec permits precisely
 *     because the posture is unsigned.
 *   - `severity` is left at this kind's default of `degraded`. See "Why this one
 *     is not informational" below — it is a real decision, not an omission.
 *
 * ## Verifying the status endpoint is real before probing it
 *
 * A JSON-shaped path returning 200 proves nothing on its own: a site with an
 * HTML catch-all returns 200 for everything, and probing one yields a
 * permanently cheerful check that means nothing at all. Two independent checks
 * were run against this host on 2026-08-03.
 *
 * **(a) Bogus siblings on the same host.** Real paths answer; invented ones do
 * not, so this is an API and not a catch-all:
 *
 *   - `GET /api/v2/status.json`     -> 200, `application/json; charset=utf-8`, 243 bytes
 *   - `GET /api/v2/summary.json`    -> 200, `application/json; charset=utf-8`, ~5 KB
 *   - `GET /api/v2/components.json` -> 200, `application/json; charset=utf-8`, ~5 KB
 *   - `GET /api/v2/notareal.json`   -> **404, zero bytes**
 *   - `GET /api/v2/statusz.json`    -> **404, zero bytes**
 *
 * **(b) Content-type and body inspection.** All three real paths answer with a
 * JSON content-type, at distinct sizes, carrying a genuine Statuspage identity
 * naming this vendor:
 *
 *     {"page":{"id":"f07lhm8ppnp0","name":"Follow Up Boss",
 *              "url":"https://followupboss.statuspage.io",
 *              "time_zone":"America/New_York", ...},
 *      "status":{"indicator":"none","description":"All Systems Operational"}}
 *
 * `summary.json` lists five named components — "Follow Up Boss Web Application",
 * **"API"**, "iPhone App", "Android App", "Follow Up Boss Public Website" — with
 * per-component `created_at` timestamps going back to 2014-03 and 2015-12. A
 * catch-all cannot fabricate an account-specific component set with a decade of
 * history.
 *
 * ### The near miss, inverted — this vendor's page IS the statuspage.io subdomain
 *
 * The usual trap runs the other way round: `<vendor>.statuspage.io` is an
 * unclaimed subdomain that 200s with ~127 KB of Atlassian marketing HTML, while
 * the real page lives at `status.<vendor>.com`. Here it is the opposite, and
 * checking cost one DNS lookup:
 *
 *   - **`status.followupboss.com` does not resolve at all** — NXDOMAIN, no A
 *     record (`curl` exits 6, "could not resolve host"). The plausible-looking
 *     vanity domain is simply not registered.
 *   - **`followupboss.statuspage.io` is a claimed, branded page.** 200,
 *     `text/html`, 191,538 bytes, `<title>Follow Up Boss Status</title>`, md5
 *     `d403f270376963544e6405ad14c5582a` — decisively *not* the 127,720-byte
 *     Atlassian marketing catch-all (md5 prefix `8d3c480a2267`) that unclaimed
 *     subdomains serve. And the JSON `page.url` field is self-referential
 *     (`https://followupboss.statuspage.io`), which is what a page with no
 *     vanity CNAME looks like from the inside.
 *
 * So the bare statuspage.io subdomain is the canonical status page here, and it
 * is the only host this check calls.
 *
 * `summary.json` rather than `status.json`: same single request, but it carries
 * the per-component breakdown as well as the rollup — and on this page the
 * breakdown is the whole point.
 *
 * ## Why the state comes from the API component, not the rollup indicator
 *
 * The obvious implementation reads `status.indicator` and maps
 * none/minor/major/critical. It is wrong here, and the component list is why.
 *
 * Three of the five components — **iPhone App**, **Android App** and **Follow Up
 * Boss Public Website** — are surfaces this app never touches. It calls
 * `api.followupboss.com` and nothing else. A mobile-app outage or a marketing-
 * site outage moves the rollup indicator, and a check keyed on the rollup would
 * report every tenant's workflows as degraded over an incident that cannot
 * affect a single API call any of them make.
 *
 * So the reported `state` is derived from the **API** component specifically,
 * and all five components are still reported in the `components` map so an
 * operator sees the full picture. This is the same failure the `discourse` app
 * addresses by dropping its check to `informational`; the difference is that
 * there the mismatch is unfixable (most Discourse installs are self-hosted, so
 * the vendor's status says nothing about a given tenant), whereas here it is
 * fixable — the vendor publishes exactly the component we depend on, so the
 * right move is to narrow the signal rather than to weaken it.
 *
 * If the API component ever disappears or is renamed, the check falls back to
 * the rollup indicator and says so in its message, rather than silently
 * reporting `unknown` forever.
 *
 * ## Why this one is NOT informational
 *
 * Having narrowed the signal to the component this app actually uses, the
 * default `degraded` severity is correct. Follow Up Boss is a pure multi-tenant
 * SaaS: there is no self-hosted edition, no per-tenant instance and no private
 * cloud, so an outage of `api.followupboss.com` affects **every** Connection
 * without exception. That is precisely the case the default severity exists for.
 * Dropping to `informational` would be hiding a real, universal outage.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

/**
 * Statuspage's four rollup indicators, used only for the fallback path.
 *
 * `major` and `critical` map to `down` rather than `degraded`. The roll-up caps
 * the effect at `degraded` anyway (severity defaults to `degraded` for kind
 * `service`), so the distinction is what an operator reads, not what it gates.
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

const STATUS_HOST = "followupboss.statuspage.io";

/** The component whose state this check reports as its own. */
const API_COMPONENT = "api";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Follow Up Boss platform status",
  description:
    "Atlassian Statuspage for followupboss.statuspage.io. The reported state tracks the **API** " +
    "component specifically — the only surface this app calls — while the mobile apps, web app " +
    "and marketing site are reported alongside it for context. Unauthenticated and unsigned.",
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
    let apiState: HealthState | undefined;
    let apiStatus: string | undefined;
    for (const c of body.components ?? []) {
      // Skip group headers — they restate their children's worst state.
      if (!c.name || c.group) continue;
      const id = slug(c.name);
      const state = COMPONENT[c.status ?? ""] ?? "unknown";
      components[id] = { state };
      if (id === API_COMPONENT) {
        apiState = state;
        apiStatus = c.status;
      }
    }

    const rollup = body.status?.description;

    if (apiState === undefined) {
      // The component we key on is gone or renamed. Fall back to the rollup and
      // say so, rather than reporting a confident `unknown` that hides the
      // reason — a silent fallback here would look identical to a healthy API.
      return {
        state: INDICATOR[body.status?.indicator ?? ""] ?? "unknown",
        message: `no "API" component on the status page; falling back to the overall rollup${
          rollup ? ` (${rollup})` : ""
        }`,
        components,
        ttlSeconds: 60,
      };
    }

    return {
      state: apiState,
      message: `API: ${apiStatus ?? "unknown"}${rollup ? ` · overall: ${rollup}` : ""}`,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
