/**
 * Is this connection's Grafana instance reachable at all?
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "dependency"` — not `service`. There is no vendor platform to be
 *     up or down: the tenant's own instance IS the dependency, and its
 *     availability is a property of their own infrastructure (or Grafana
 *     Cloud stack).
 *   - `scope: "connection"` — every Connection points at a different
 *     instance, so there is no shareable app-wide answer.
 *   - `credential: "context"` — the posture a boolean would lose. This check
 *     needs the Connection to know WHICH host to call, and needs no
 *     credential to interpret the answer. `sign` must not run.
 *   - No `network.allow` is declared: the instance is already reachable
 *     under the app's own `"*"` allowlist, and a `context` check is unsigned
 *     regardless.
 *   - `severity` defaults to `degraded` for `dependency`. An instance being
 *     gone is arguably fatal, but the derived `auth:*` check already covers
 *     the case where the credential itself stops working, so this one stays
 *     advisory.
 *
 * `GET /api/health` is Grafana's own unauthenticated health probe — confirmed
 * against Grafana's own HTTP API docs: it returns `{ commit, database,
 * version }` with no auth required, specifically so monitoring tooling can
 * check instance liveness without a credential. A `database` field other
 * than `"ok"` means the instance answered but its own datastore is broken —
 * a different failure from "unreachable". Only a transport failure, a 404
 * (nothing Grafana-shaped listening at that URL) or a 5xx says the instance
 * itself is the problem — which is a different failure from a bad
 * credential, and exactly the distinction the derived `auth:*` check cannot
 * make.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const site: HealthCheckDefinition = {
  key: "site",
  title: "Instance reachable",
  description: "Unauthenticated `GET /api/health` against this connection's endpoint — " +
    "Grafana's own liveness probe, which needs no credential.",
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

    const res = await ctx.fetch(`${endpoint}/api/health`);
    if (res.status === 404) {
      return { state: "down", message: "endpoint does not look like a Grafana instance (404)" };
    }
    if (res.status >= 500) {
      return { state: "down", message: `instance returned ${res.status}` };
    }
    if (!res.ok) {
      return {
        state: "degraded",
        message: `health endpoint returned ${res.status}`,
        ttlSeconds: 120,
      };
    }

    let body: { database?: string } = {};
    try {
      body = await res.json();
    } catch {
      return { state: "unknown", message: "health endpoint returned a non-JSON body" };
    }
    if (body.database && body.database !== "ok") {
      return {
        state: "degraded",
        message: `instance database status is "${body.database}"`,
        ttlSeconds: 120,
      };
    }
    return { state: "ok", ttlSeconds: 120 };
  },
};

export default site;
