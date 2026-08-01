/**
 * Is THIS connection's database host reachable — independent of whether its
 * token happens to be valid?
 *
 * Every Upstash Redis database has its own REST URL, so "wrong/renamed URL"
 * and "expired token" are genuinely different failures — the same
 * distinction Zendesk's per-account subdomain draws (see
 * `../../zendesk/health/account.ts`), adapted for the fact that Upstash's
 * REST API requires a token on every call, including `PING`.
 *
 * The docs (https://upstash.com/docs/redis/features/restapi) document `401
 * Unauthorized` explicitly for "auth token is missing or invalid" — so an
 * UNAUTHENTICATED call that comes back 401 still proves DNS resolved, TLS
 * terminated, and the database is answering. That is exactly what this
 * check is for; whether the stored token is any good is the derived
 * `auth:rest-token` check's job.
 *
 * `credential: "context"` is the posture a boolean would lose: the check
 * needs the Connection to know WHICH host to call, and needs no credential
 * to interpret the answer. `sign` must not run. No `network.allow` is
 * declared: `*.upstash.io` is already on the app's allowlist, and a
 * `context` check is unsigned regardless.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { restUrlFromConnection } from "../lib/client.ts";

const host: HealthCheckDefinition = {
  key: "host",
  title: "Database host reachable",
  description:
    "Unauthenticated PING against this connection's REST URL. A 401 passes — it proves the host is answering; credential validity is the auth:rest-token check's job.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    let restUrl: string;
    try {
      restUrl = restUrlFromConnection(ctx.connection);
    } catch {
      return { state: "unknown", message: "connection records no REST URL" };
    }

    const res = await ctx.fetch(`${restUrl}/ping`, { method: "POST" });
    if (res.status === 401) {
      // Expected: the host answered and enforced auth, exactly as documented.
      return { state: "ok", ttlSeconds: 120 };
    }
    if (res.status === 404) {
      return { state: "down", message: "database not found — it may have been deleted" };
    }
    if (res.status >= 500) {
      return { state: "down", message: `host returned ${res.status}` };
    }
    if (res.ok) return { state: "ok", ttlSeconds: 120 };
    return { state: "unknown", message: `unexpected status ${res.status}` };
  },
};

export default host;
