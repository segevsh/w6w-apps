/**
 * Is this connection's WooCommerce store reachable, and is its WordPress REST
 * API alive?
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "dependency"` — not `service`. There is no vendor platform to be
 *     up or down: a self-hosted WooCommerce store IS the dependency, and its
 *     availability is a property of the tenant's own WordPress infrastructure.
 *   - `scope: "connection"` — every Connection points at a different store, so
 *     there is no shareable app-wide answer.
 *   - `credential: "context"` — the posture a boolean would lose. This check
 *     needs the Connection to know WHICH host to call, and needs no credential
 *     to interpret the answer. `sign` must not run.
 *   - No `network.allow` is declared: the store is already reachable under the
 *     app's own allowlist, and a `context` check is unsigned regardless.
 *   - `severity` defaults to `degraded` for this kind. A store being gone is
 *     arguably fatal, but the derived `auth:*` check already covers the case
 *     where the credential stops working, so this one stays advisory.
 *
 * `GET /wp-json/` is WordPress' unauthenticated REST discovery document — the
 * layer WooCommerce's own `/wp-json/wc/v3` routes are mounted under. Probing it
 * (rather than an authenticated `wc/v3` route) separates two failures a
 * credential check would conflate: the store is gone / DNS is wrong (transport
 * failure), versus the REST API has been disabled or blocked by a security
 * plugin (a 401/403/404 on a route that should always be public). Either is a
 * very different problem from a bad key, which is what `auth:*` reports.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const site: HealthCheckDefinition = {
  key: "site",
  title: "Store reachable",
  description:
    "Unauthenticated `GET /wp-json/` against this connection's store — proves the host resolves AND that the WordPress REST API WooCommerce rides on is enabled.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as { storeUrl?: string };
    const storeUrl = display.storeUrl?.replace(/\/+$/, "");
    if (!storeUrl) return { state: "unknown", message: "connection records no store URL" };

    const res = await ctx.fetch(`${storeUrl}/wp-json/`);
    if (res.status === 404 || res.status === 403) {
      return {
        state: "down",
        message: `REST API disabled or blocked by a plugin (${res.status})`,
      };
    }
    if (res.status >= 500) {
      return { state: "down", message: `store returned ${res.status}` };
    }
    return res.ok ? { state: "ok", ttlSeconds: 120 } : {
      state: "degraded",
      message: `discovery document returned ${res.status}`,
      ttlSeconds: 120,
    };
  },
};

export default site;
