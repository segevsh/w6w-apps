/**
 * Is **this connection's** Gotify server healthy? — its own `GET /health`.
 *
 * For a self-hosted app this is the check that matters: the server is the
 * operator's, and a health page nobody publishes could not tell you about it
 * even if one existed. Gotify ships this endpoint FOR exactly this purpose —
 * `api/health.go`: `Ping()`s the database and answers `{health, database}`
 * with values `"green"` (`model.StatusGreen`), `"orange"`
 * (`model.StatusOrange`) or `"red"` (`model.StatusRed`); a failed ping
 * answers HTTP 500 with `{health: "orange", database: "red"}` rather than a
 * transport error, so this check reads the *body* on both 200 and 500 rather
 * than trusting the status code alone.
 *
 * Reading it unsigned matters, even though `/health` itself needs no
 * credential: an expired or revoked client token must not make a perfectly
 * healthy server look down.
 *
 * Annotation:
 *
 *   - `kind: "dependency"` — "is the thing this Connection points at
 *     reachable and healthy", not "is the Gotify project up" (`service`,
 *     declared unavailable below) and not "is the credential live" (the
 *     derived `auth:*` check).
 *   - `scope: "connection"` — every Connection points at a different server.
 *   - `credential: "context"` — the Connection supplies the URL; `/health`
 *     needs no token to interpret.
 *
 * No `network.allow` entry: the instance host is the app's own allowlist,
 * which is `["*"]` because only the operator knows the address.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { baseUrlFromConnection } from "../lib/client.ts";
import type { GotifyErrorBody } from "../lib/client.ts";

interface HealthBody {
  health?: string;
  database?: string;
}

const instance: HealthCheckDefinition = {
  key: "instance",
  title: "Gotify instance healthy",
  description: "This connection's own server, via its unauthenticated /health endpoint. Sends no " +
    "credential — an expired token must not make the server look down.",
  kind: "dependency",
  covers: ["*"],
  scope: "connection",
  credential: "context",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let base: string;
    try {
      base = baseUrlFromConnection(ctx.connection);
    } catch (err) {
      return { state: "unknown", message: String((err as Error).message) };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${base}/health`, { headers: { accept: "application/json" } });
    } catch (err) {
      // A server that cannot be reached at all IS the failure this check is for.
      return { state: "down", message: `instance unreachable: ${String(err)}` };
    }

    if (res.status === 404) {
      return {
        state: "unknown",
        message: `nothing at ${base}/health (404) — is the instance URL right, and is it ` +
          "Gotify 2.1+? (older versions do not expose /health)",
      };
    }

    const body = await res.json().catch(() => null) as (HealthBody & GotifyErrorBody) | null;
    if (!body?.health) {
      return {
        state: "unknown",
        message: res.ok ? "/health answered an unexpected shape" : `/health returned ${res.status}`,
      };
    }

    const message = `health=${body.health} database=${body.database ?? "unknown"}`;
    if (body.health === "green") return { state: "ok", message, ttlSeconds: 60 };
    if (body.health === "orange") return { state: "degraded", message };
    return { state: "down", message };
  },
};

export default instance;
