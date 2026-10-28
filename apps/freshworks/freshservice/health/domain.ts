/**
 * Is this connection's Freshservice domain reachable?
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "dependency"` — the `service` check speaks for the Freshservice
 *     platform as a whole. This one speaks for THIS account's host, which is a
 *     different failure: the portal was renamed, the subdomain was released,
 *     DNS is wrong.
 *   - `scope: "connection"` — every Connection points at a different domain,
 *     which is also a different account.
 *   - `credential: "context"` — the posture a boolean would lose. The check
 *     needs the Connection to know WHICH host to call, and needs no
 *     credential to interpret the answer. `sign` must not run.
 *   - No `network.allow` is declared: `*.freshservice.com` is already on the
 *     app's allowlist, and a `context` check is unsigned regardless.
 *   - `severity` defaults to `degraded` for this kind.
 *
 * The probe is deliberately unauthenticated, so a **403 is a pass**. Verified
 * on the wire: a live portal answers an unsigned `GET /api/v2/tickets` with
 * `403` plus `X-Freshservice-Api-Version` and the `X-Ratelimit-*` headers,
 * which proves the domain resolves, TLS terminates and the API is answering —
 * exactly what this check is for. A subdomain that was never provisioned
 * answers `404` with none of those headers. Whether the credential is any good
 * is the derived `auth:*` check's job, and conflating the two is how "the
 * portal was renamed" gets misreported as "your API key expired." Only a
 * transport failure (the hook throws), a 404 or a 5xx counts as down.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

const domain: HealthCheckDefinition = {
  key: "domain",
  title: "Account domain reachable",
  description:
    "Unauthenticated request to this connection's Freshservice domain. A 403 passes — it proves the portal is serving; credential validity is the `auth:*` check's job.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as { domain?: string };
    if (!display.domain) {
      return { state: "unknown", message: "connection records no domain" };
    }

    const res = await ctx.fetch(`${baseUrl(display.domain)}/tickets?per_page=1`);
    if (res.status === 404) {
      return { state: "down", message: "domain not found — the portal may have been renamed" };
    }
    if (res.status >= 500) {
      return { state: "down", message: `domain returned ${res.status}` };
    }
    // 200, 401 and 403 all mean the portal is serving. That is the whole question.
    return { state: "ok", ttlSeconds: 120 };
  },
};

export default domain;
