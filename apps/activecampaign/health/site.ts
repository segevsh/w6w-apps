/**
 * Is this connection's ActiveCampaign API host reachable?
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "dependency"` — the vendor platform is covered by `service`
 *     (status.activecampaign.com). This is the narrower question of whether
 *     THIS account's own API host answers — ActiveCampaign's docs are
 *     explicit that the host is per-account and not guaranteed to share any
 *     fixed suffix ("It is explicitly not a guarantee that api-us1.com is
 *     always a supported API Base URL for all current and future users"),
 *     which is also why `w6w.network.allow` is `"*"` rather than a wildcard
 *     suffix.
 *   - `scope: "connection"` — every Connection points at a different host.
 *   - `credential: "context"` — the posture a boolean would lose. The check
 *     needs the Connection to know WHICH host to call, and needs no
 *     credential to interpret the answer. `sign` must not run.
 *   - No `network.allow` is declared: `"*"` already covers any host, and a
 *     `context` check is unsigned regardless.
 *   - `severity` defaults to `degraded` for this kind.
 *
 * The probe is deliberately unauthenticated, so a 401/403 is a pass: it
 * proves the host resolves, TLS terminates, and the ActiveCampaign API is
 * answering behind it — which is exactly what this check is for. Whether the
 * credential is any good is the derived `auth:*` check's job, and conflating
 * the two is how "the account was suspended" gets misreported as "your token
 * expired". Only a transport failure (the fetch itself fails) or a 5xx
 * counts as down; a 404 is treated as down too, since every documented
 * ActiveCampaign v3 resource path answers something other than 404 when the
 * host itself is correct.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

const site: HealthCheckDefinition = {
  key: "site",
  title: "API host reachable",
  description:
    "Unauthenticated request to this connection's ActiveCampaign API host. A 401/403 passes — it proves the host is serving; credential validity is the `auth:*` check's job.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as { apiUrl?: string };
    if (!display.apiUrl) {
      return { state: "unknown", message: "connection records no apiUrl" };
    }

    const res = await ctx.fetch(`${baseUrl(display.apiUrl)}/contacts?limit=1`);
    if (res.status === 404) {
      return { state: "down", message: "API host returned 404 — the URL may be wrong" };
    }
    if (res.status >= 500) {
      return { state: "down", message: `API host returned ${res.status}` };
    }
    // 200, 401 and 403 all mean the host is serving the ActiveCampaign API.
    // That is the whole question.
    return { state: "ok", ttlSeconds: 120 };
  },
};

export default site;
