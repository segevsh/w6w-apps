/**
 * Is this connection's Strapi instance reachable at all?
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "dependency"` — not `service`. There is no vendor platform to be
 *     up or down: the tenant's own instance IS the dependency, and its
 *     availability is a property of their own infrastructure (or Strapi
 *     Cloud deployment).
 *   - `scope: "connection"` — every Connection points at a different
 *     instance, so there is no shareable app-wide answer.
 *   - `credential: "context"` — the posture a boolean would lose. This check
 *     needs the Connection to know WHICH host to call, and needs no
 *     credential to interpret the answer. `sign` must not run.
 *   - No `network.allow` is declared: the instance is already reachable under
 *     the app's own `"*"` allowlist, and a `context` check is unsigned
 *     regardless.
 *   - `severity` defaults to `degraded` for `dependency`. An instance being
 *     gone is arguably fatal, but the derived `auth:*` check already covers
 *     the case where the credential itself stops working, so this one stays
 *     advisory.
 *
 * `GET /_health` is the probe — Strapi's own built-in liveness route
 * (confirmed against Strapi's server-configuration docs), present in every
 * Strapi instance regardless of version or plugin configuration. It answers
 * unauthenticated with an empty `204` body and a `strapi` response header,
 * which is exactly what a plain reachability probe wants: no content type,
 * no permission, no auth needed. A transport failure or a non-2xx response
 * means the instance itself — not a specific credential — is the problem.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const site: HealthCheckDefinition = {
  key: "site",
  title: "Instance reachable",
  description: "Unauthenticated `GET /_health` against this connection's endpoint — Strapi's " +
    "own built-in liveness route, present on every instance.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as { endpoint?: string };
    const endpoint = display.endpoint?.replace(/\/+$/, "");
    if (!endpoint) return { state: "unknown", message: "connection records no endpoint" };

    const res = await ctx.fetch(`${endpoint}/_health`);
    if (res.status >= 500) {
      return { state: "down", message: `instance returned ${res.status}` };
    }
    if (res.status === 404) {
      return { state: "down", message: "endpoint does not look like a Strapi instance (404)" };
    }
    return res.ok ? { state: "ok", ttlSeconds: 120 } : {
      state: "degraded",
      message: `/_health returned ${res.status}`,
      ttlSeconds: 120,
    };
  },
};

export default site;
