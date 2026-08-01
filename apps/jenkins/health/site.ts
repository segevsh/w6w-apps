/**
 * Is this connection's instance reachable at all?
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "dependency"` — not `service`. There is no vendor platform to be
 *     up or down: the tenant's own instance IS the dependency, and its
 *     availability is a property of their own infrastructure.
 *   - `scope: "connection"` — every Connection points at a different
 *     instance, so there is no shareable app-wide answer.
 *   - `credential: "context"` — the posture a boolean would lose. This check
 *     needs the Connection to know WHICH host to call, and needs no
 *     credential to interpret the answer. `sign` must not run.
 *   - No `network.allow` is declared: the instance is already reachable under
 *     the app's own `"*"` allowlist, and a `context` check is unsigned
 *     regardless.
 *   - `severity` defaults to `degraded` for `dependency`. An instance being
 *     gone is arguably fatal, but the derived `auth:basic` check already
 *     covers the case where the credential itself stops working, so this one
 *     stays advisory.
 *
 * `GET /api/json` unauthenticated is the probe, and a `401`/`403` counts as
 * reachable: Jenkins with its default security setup rejects an anonymous
 * request to `/api/json` with `403 Forbidden` (anonymous missing
 * `Overall/Read`), or `401` depending on the configured security realm —
 * either way that response only happens because a live Jenkins instance
 * evaluated and rejected the request. Only a transport failure, a `404`
 * (nothing Jenkins-shaped listening at that URL), or a `5xx` says the
 * instance itself is the problem — a different failure from a bad
 * credential, which is exactly the distinction the derived `auth:basic`
 * check cannot make on its own.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const site: HealthCheckDefinition = {
  key: "site",
  title: "Instance reachable",
  description: "Unauthenticated `GET /api/json` against this connection's endpoint. A " +
    "401/403 counts as reachable — it proves a live Jenkins instance evaluated and rejected " +
    "the anonymous request.",
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

    const res = await ctx.fetch(`${endpoint}/api/json`);
    if (res.status === 401 || res.status === 403) {
      // Security rejected the unauthenticated call — the instance IS up and speaking HTTP.
      return { state: "ok", ttlSeconds: 120 };
    }
    if (res.status === 404) {
      return { state: "down", message: "endpoint does not look like a Jenkins instance (404)" };
    }
    if (res.status >= 500) {
      return { state: "down", message: `instance returned ${res.status}` };
    }
    return res.ok ? { state: "ok", ttlSeconds: 120 } : {
      state: "degraded",
      message: `root endpoint returned ${res.status}`,
      ttlSeconds: 120,
    };
  },
};

export default site;
