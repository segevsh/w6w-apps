/**
 * Is this connection's WordPress site reachable, and is its REST API alive?
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "dependency"` — not `service`. There is no vendor platform to be
 *     up or down: a self-hosted WordPress site IS the dependency, and its
 *     availability is a property of the tenant's own infrastructure.
 *   - `scope: "connection"` — every Connection points at a different site, so
 *     there is no shareable app-wide answer.
 *   - `credential: "context"` — the posture a boolean would lose. This check
 *     needs the Connection to know WHICH host to call, and needs no credential
 *     to interpret the answer. `sign` must not run.
 *   - No `network.allow` is declared: the site is already reachable under the
 *     app's own allowlist, and a `context` check is unsigned regardless.
 *   - `severity` defaults to `degraded` for this kind. A site being gone is
 *     arguably fatal, but the derived `auth:*` check already covers the case
 *     where the credential stops working, so this one stays advisory.
 *
 * `GET /wp-json/` is the REST API's unauthenticated discovery document. Probing
 * it separates two failures that a credential check would conflate: the site is
 * gone / DNS is wrong (transport failure), versus the REST API has been
 * disabled or blocked by a security plugin (a 401/403/404 on a route that
 * should always be public). Either is a very different problem from a bad
 * password, which is what `auth:*` reports.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const site: HealthCheckDefinition = {
  key: "site",
  title: "Site reachable",
  description:
    "Unauthenticated `GET /wp-json/` against this connection's site — proves the host resolves AND that the REST API is enabled.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as {
      siteUrl?: string;
      wordpressSite?: string;
    };
    const siteUrl = (display.siteUrl ?? display.wordpressSite)?.replace(/\/+$/, "");
    if (!siteUrl) return { state: "unknown", message: "connection records no site URL" };

    const res = await ctx.fetch(`${siteUrl}/wp-json/`);
    if (res.status === 404 || res.status === 403) {
      return {
        state: "down",
        message: `REST API disabled or blocked by a plugin (${res.status})`,
      };
    }
    if (res.status >= 500) {
      return { state: "down", message: `site returned ${res.status}` };
    }
    return res.ok ? { state: "ok", ttlSeconds: 120 } : {
      state: "degraded",
      message: `discovery document returned ${res.status}`,
      ttlSeconds: 120,
    };
  },
};

export default site;
