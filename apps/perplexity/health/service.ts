/**
 * Is Perplexity up? — `status.perplexity.com`, an **Instatus** page (the
 * obvious `status.perplexity.ai` host 301s here — see below).
 *
 * ## Two hosts, verified separately
 *
 * `status.perplexity.ai` (the guess a vendor's own apex would suggest) is a
 * live redirect, not a decommissioned trap: `curl -sIL` follows it straight to
 * `https://status.perplexity.com/`, HTTP 200. The check below targets the
 * final host directly rather than relying on a redirect an unsigned `ctx.fetch`
 * may or may not follow the same way.
 *
 * ## `/v2/summary.json` looked right and answered wrong
 *
 * The pack-wide convention for an Instatus/Statuspage-style page is
 * `/v2/summary.json` or `/api/v2/summary.json`. Both resolve here (HTTP 200,
 * `application/json`), but the body is only
 * `{"page":{"name":"Perplexity","url":"https://status.perplexity.com","status":"UP"}}`
 * — no `components`, no `activeIncidents`. Reading `page.status` alone would
 * report "UP" through a real, open incident the moment one exists, the exact
 * trap documented pack-wide for Manychat's Instatus page.
 *
 * `/v2/components.json` carries the actual per-component breakdown (measured
 * 2026-08-16):
 *
 *     {"components":[
 *       {"id":"…","name":"Website","status":"OPERATIONAL","group":null},
 *       {"id":"…","name":"API","status":"OPERATIONAL","group":null},
 *       {"id":"…","name":"Computer","status":"OPERATIONAL","group":null}]}
 *
 * Verified as a real routed JSON endpoint, not a catch-all: a bogus sibling
 * path on the same host (`GET /v2/bogus-sibling-xyz.json`) answers a Next.js
 * `404` shell (`text/html`, 7001 bytes); the real path answers `200`
 * `application/json`, 330 bytes — different status, different content-type,
 * different bytes.
 *
 * ## Which component drives `state`
 *
 * Three components, and only one is this app's business: **API**. `Website`
 * is the marketing/account site; `Computer` is Perplexity's separate
 * browser-automation agent product (its own MCP server, unrelated to
 * `/v1/sonar`, `/search`, `/v1/embeddings`, or `/v1/models`). Neither is
 * reported through to `state` — both are still surfaced in `components` for
 * attribution, so a chat-completion outage is never confused with the
 * marketing site being down.
 *
 * If `API` ever disappears from the feed (renamed, regrouped), this reports
 * `unknown` with a message saying so rather than silently reporting on a
 * different component.
 *
 * ## Annotation
 *
 *   - `kind: "service"` — "is the vendor up", distinct from credential
 *     liveness (the derived `auth:api-key` check) and quota (not published —
 *     see `health/quota.ts` for why there is no dedicated quota check).
 *   - `scope: "app"` (this kind's default) — identical answer for every
 *     Connection; one shared probe instead of one per user.
 *   - `credential: "none"` (also the default) — no Connection needed, `sign`
 *     never runs; this reports before anyone has connected.
 *   - `network.allow` — `status.perplexity.com` is deliberately **not** on the
 *     app's manifest allowlist; no Action has business calling it. Egress is
 *     widened for this one unsigned hook only.
 *   - `severity` left at this kind's default (`degraded`): Perplexity is pure
 *     SaaS with one API host, so an `API` outage genuinely affects every
 *     Connection.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const STATUS_HOST = "status.perplexity.com";

/** The component whose health is this integration's health. */
const API_COMPONENT = "api";

/** Instatus's component vocabulary. `UNDERMAINTENANCE` reads as `degraded`, not `down`. */
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
  title: "Perplexity platform status",
  description: "Instatus per-component status for status.perplexity.com. The verdict tracks " +
    "the `API` component; `Website` and `Computer` are reported for attribution only. " +
    "Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  credential: "none",
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/v2/components.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => null) as { components?: unknown } | null;
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
        message: `status page no longer publishes an "${API_COMPONENT}" component`,
        components,
        ttlSeconds: 60,
      };
    }

    return {
      state: apiState,
      message: apiState === "ok"
        ? undefined
        : `Perplexity API is ${String(apiState).toUpperCase()}`,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
