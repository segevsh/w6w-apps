/**
 * Is Manychat up? — `status.manychat.com`, an **Instatus** page (not Atlassian
 * Statuspage, and that distinction cost the obvious first guess).
 *
 * ## The obvious host is dead, and it fails open
 *
 * The reflex for any vendor is `<vendor>.statuspage.io`. Manychat *has* one, and
 * shipping a probe against it would have been a silent, permanent `unknown`:
 *
 *     $ curl -sSIL https://manychat.statuspage.io
 *     … 200, redirected to https://manychat.statuspage.io/inactive
 *     $ curl -sS https://manychat.statuspage.io/api/v2/status.json
 *     HTTP 401 · application/json
 *     Your page is inactive. Please include an API key to access this resource.
 *
 * Checked 2026-08-03. It is a decommissioned page, not the live one. The live one
 * is `status.manychat.com`, which Instatus serves.
 *
 * ## Verified two ways, because "returns 200" proves nothing
 *
 *   1. **Bogus sibling path on the same host.** `GET /bogus-sibling-xyz.json` →
 *      **HTTP 404, `text/html; charset=utf-8`, 7418 bytes, md5 `3cfb919b764e…`**
 *      — a Next.js 404 shell. The real path returns **HTTP 200,
 *      `application/json`, 419 bytes, md5 `9c6ca6ad9447…`**. Different status,
 *      different content-type, different bytes: this host routes, it is not a
 *      catch-all. (`/status.json` and `/api/status.json` return the same 404
 *      shell, which is how the correct path was found rather than assumed.)
 *   2. **Content-type *and* body.** `/v2/components.json` → **HTTP 200,
 *      `application/json`, 1874 bytes**, opening
 *      `{"components":[{"id":"clbf5tl610000ixn2dimgd1yj-6fpt42w2j7f8","name":
 *      "Manychat: Web Application",…}` — JSON for a `.json` path, with Manychat's
 *      own component names in it. Not an HTML impostor, and not the ~127 KB
 *      Atlassian marketing page an unclaimed subdomain serves.
 *
 * A 200 with an error body is still not health, so `check` refuses to interpret
 * anything unless `components` is genuinely an array.
 *
 * ## Why `/v2/components.json` and not `/summary.json`
 *
 * `/summary.json` is the smaller, more obvious probe — one round trip for
 * `page.status` plus `activeIncidents[]`. It was ruled out on evidence, not
 * taste. On 2026-08-03 it returned:
 *
 *     {"page":{"name":"Manychat","url":"…","status":"UP"},
 *      "activeIncidents":[{"name":"Delays and failures in Follow to DM … on
 *      Instagram","status":"IDENTIFIED","impact":"DEGRADEDPERFORMANCE",…}]}
 *
 * `page.status` said **UP** while an incident was open and identified. A check
 * reading that field alone would have reported green through a real, ongoing
 * degradation; a check reading `activeIncidents` alone would have reported a
 * Messenger-only tenant as degraded over an Instagram problem it cannot feel.
 * `components.json` costs the same one request and answers both correctly,
 * because Manychat publishes the surfaces separately.
 *
 * ## Which component drives `state` — and why not all of them
 *
 * The eleven components split cleanly in two, and conflating them is the trap:
 *
 *   - **Manychat's own** — Web Application, Sign In / Sign Up, Message sending,
 *     Growth Tools, **Public API**, AI Services.
 *   - **Third-party channels** — Facebook API, Instagram API, WhatsApp API,
 *     Telegram API, Twilio API (SMS/MMS).
 *
 * `state` is taken from **`Manychat: Public API`** alone: that is the surface
 * every action in this app calls, and it is the only one whose failure is a
 * failure *of this integration*. Every other component is reported in
 * `components` for attribution but is not folded into `state`.
 *
 * The third-party ones must not drive the verdict, because they are **not
 * universal across tenants**: a Page automating only Messenger is unaffected by a
 * WhatsApp API outage, and marking that tenant degraded is a false alarm about
 * something it does not use. Manychat's own non-API components are excluded for a
 * milder version of the same reason — a broken Sign In page or a stalled AI
 * feature does not stop a workflow that only calls the Public API.
 *
 * If `Manychat: Public API` ever disappears from the feed (renamed, regrouped),
 * this reports `unknown` with a message saying so, rather than silently falling
 * back to a different component's answer.
 *
 * ## Annotation
 *
 *   - `kind: "service"` — "is the vendor up", a different question from
 *     credential liveness (the derived `auth:api-token` check) and from quota.
 *   - `scope: "app"` (this kind's default) — the answer is identical for every
 *     Connection, so the host runs it once and shares it. Per-Connection would
 *     multiply one useful call by the user count and get us throttled by a status
 *     page.
 *   - `credential: "none"` (also the default) — no Connection needed, `sign`
 *     never runs, so this reports before anyone has connected. A signed request
 *     must never reach a third-party status host.
 *   - `network.allow` — `status.manychat.com` is deliberately **not** on the
 *     app's manifest allowlist; no action has business calling it. Egress is
 *     widened for this one unsigned hook.
 *   - `severity` is left at this kind's default (`degraded`), and that is a
 *     considered choice. Manychat is pure SaaS: there is no self-hosted edition,
 *     no per-tenant hostname, and exactly one API host, so a Public API outage
 *     genuinely does hit every tenant. (Contrast `apps/discourse`, whose status
 *     page covers Discourse's *hosting* while most installs are self-hosted —
 *     there, the default severity would falsely degrade unaffected tenants, so it
 *     is downgraded to informational. The per-tenant risk here lives entirely in
 *     the third-party channel components, and those are excluded from `state`
 *     for precisely that reason.)
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const STATUS_HOST = "status.manychat.com";

/** The component whose health is this integration's health. */
const API_COMPONENT = "manychat: public api";

/**
 * Instatus's component vocabulary. `UNDERMAINTENANCE` maps to `degraded` rather
 * than `down`: planned work still means calls may fail, but it is not an
 * incident.
 */
const COMPONENT: Record<string, HealthState> = {
  OPERATIONAL: "ok",
  DEGRADEDPERFORMANCE: "degraded",
  PARTIALOUTAGE: "degraded",
  MAJOROUTAGE: "down",
  UNDERMAINTENANCE: "degraded",
};

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

interface InstatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: string | null;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Manychat platform status",
  description: "Instatus per-component status for status.manychat.com. The verdict tracks the " +
    "`Manychat: Public API` component; the other ten are reported for attribution only. " +
    "Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/v2/components.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => null) as { components?: unknown } | null;
    // A 200 carrying an error body is not health. Nothing below runs unless the
    // payload is the shape this check was written against.
    if (!body || !Array.isArray(body.components)) {
      return { state: "unknown", message: "status API returned an unexpected payload" };
    }

    const components: Record<string, { state: HealthState; message?: string }> = {};
    let apiState: HealthState | undefined;

    for (const raw of body.components as InstatusComponent[]) {
      if (!raw?.name) continue;
      const state = COMPONENT[String(raw.status ?? "").toUpperCase()] ?? "unknown";
      components[slug(raw.name)] = { state };
      if (raw.name.toLowerCase() === API_COMPONENT) apiState = state;
    }

    if (apiState === undefined) {
      return {
        state: "unknown",
        message: `status page no longer publishes a "${API_COMPONENT}" component`,
        components,
        ttlSeconds: 60,
      };
    }

    return {
      state: apiState,
      message: apiState === "ok"
        ? undefined
        : `Manychat: Public API is ${String(apiState).toUpperCase()}`,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
