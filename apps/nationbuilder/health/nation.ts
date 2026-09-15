/**
 * Is this connection's nation subdomain reachable?
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "dependency"` — NationBuilder's own status page (`service.ts`)
 *     is a single shared page across every nation; it says nothing about
 *     whether THIS one specific `{slug}.nationbuilder.com` host is up
 *     (suspended account, DNS issue, a nation on maintenance).
 *   - `scope: "connection"` — every Connection points at a different nation.
 *   - `credential: "context"` — the posture a boolean would lose. The check
 *     needs the Connection to know WHICH host to call, and needs no
 *     credential to interpret the answer. `sign` must not run.
 *   - No `network.allow` is declared: `*.nationbuilder.com` is already on
 *     the app's allowlist, and a `context` check is unsigned regardless.
 *
 * The probe is deliberately unauthenticated, so a **401 is a pass**: per
 * the vendor's own OpenAPI spec, `GET /api/v2/signups/me` without a token
 * answers 401 with the documented `{ code: "unauthorized", message: ... }`
 * envelope — proof the nation's v2 API is up and answering. Whether the
 * credential itself is any good is the derived `auth:*` check's job;
 * conflating the two would misreport "the nation was suspended" as "your
 * token expired". Only a transport failure (the hook throws), a 404
 * (subdomain does not resolve to a nation) or a 5xx counts as down.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

const nation: HealthCheckDefinition = {
  key: "nation",
  title: "Nation subdomain reachable",
  description:
    "Unauthenticated request to this connection's nation subdomain. A 401 passes — it proves " +
    "the nation is serving; credential validity is the auth:* check's job.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const display = (ctx.connection?.display ?? {}) as { slug?: string };
    if (!display.slug) {
      return { state: "unknown", message: "connection records no nation slug" };
    }

    const res = await ctx.fetch(`${baseUrl(display.slug)}/signups/me`);
    if (res.status === 404) {
      return { state: "down", message: "nation not found — the slug may have changed" };
    }
    if (res.status >= 500) {
      return { state: "down", message: `nation returned ${res.status}` };
    }
    // 200 and 401 both mean the nation is serving. That is the whole question.
    return { state: "ok", ttlSeconds: 120 };
  },
};

export default nation;
