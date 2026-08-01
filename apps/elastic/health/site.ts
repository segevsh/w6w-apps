/**
 * Is this connection's cluster reachable at all?
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "dependency"` — not `service`. There is no vendor platform to be
 *     up or down: the tenant's own cluster IS the dependency, and its
 *     availability is a property of their own infrastructure (or Elastic
 *     Cloud deployment).
 *   - `scope: "connection"` — every Connection points at a different cluster,
 *     so there is no shareable app-wide answer.
 *   - `credential: "context"` — the posture a boolean would lose. This check
 *     needs the Connection to know WHICH host to call, and needs no
 *     credential to interpret the answer. `sign` must not run.
 *   - No `network.allow` is declared: the cluster is already reachable under
 *     the app's own `"*"` allowlist, and a `context` check is unsigned
 *     regardless.
 *   - `severity` defaults to `degraded` for `dependency`. A cluster being gone
 *     is arguably fatal, but the derived `auth:*` check already covers the
 *     case where the credential itself stops working, so this one stays
 *     advisory.
 *
 * `GET /` unauthenticated is the probe, and a `401` counts as reachable —
 * confirmed against Elastic's own docs: Elasticsearch has enabled security by
 * default since 8.0, so a live, healthy cluster answers an unauthenticated
 * request with 401 (complete with a `WWW-Authenticate` header) rather than
 * refusing the connection. Only a transport failure, a 404 (nothing
 * Elasticsearch-shaped listening at that URL) or a 5xx says the cluster
 * itself is the problem — which is a different failure from a bad credential,
 * and exactly the distinction the derived `auth:*` check cannot make.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const site: HealthCheckDefinition = {
  key: "site",
  title: "Cluster reachable",
  description:
    "Unauthenticated `GET /` against this connection's endpoint. A 401 counts as reachable " +
    "— it proves a live, security-enabled Elasticsearch cluster answered.",
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

    const res = await ctx.fetch(`${endpoint}/`);
    if (res.status === 401 || res.status === 403) {
      // Security rejected the unauthenticated call — the cluster IS up and speaking HTTP.
      return { state: "ok", ttlSeconds: 120 };
    }
    if (res.status === 404) {
      return {
        state: "down",
        message: "endpoint does not look like an Elasticsearch cluster (404)",
      };
    }
    if (res.status >= 500) {
      return { state: "down", message: `cluster returned ${res.status}` };
    }
    return res.ok ? { state: "ok", ttlSeconds: 120 } : {
      state: "degraded",
      message: `root endpoint returned ${res.status}`,
      ttlSeconds: 120,
    };
  },
};

export default site;
