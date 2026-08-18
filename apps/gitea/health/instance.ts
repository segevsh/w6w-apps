/**
 * Is **this connection's** Gitea reachable? — the instance's own `/version`.
 *
 * For a self-hosted app this is the check that matters, and it is a different
 * question from "is the vendor up": the server is the operator's, and may be a
 * container on a laptop or a box behind a VPN that no status page has heard of.
 *
 * Gitea answers `GET /api/v1/version` **unauthenticated** with
 * `{"version":"1.27.0+dev-836-g5f846d7aa5"}` — verified against `gitea.com`
 * 2026-08-18. Reading it unsigned matters: an expired token must not make a
 * perfectly healthy server look down.
 *
 * The version is reported in the message on purpose. Gitea's API surface moves
 * between releases — endpoints appear, and the query-parameter token scheme
 * this app avoids is marked for removal in 1.23 — so when an action 404s on one
 * instance and works on another, this is where the answer is.
 *
 * Annotation:
 *
 *   - `kind: "dependency"` — "is the thing this Connection points at
 *     reachable", not "is the vendor's platform up" (`service`) and not "is the
 *     credential live" (the derived `auth:*` check).
 *   - `scope: "connection"` — every Connection points at a different server.
 *   - `credential: "context"` — the Connection supplies the URL, and `/version`
 *     needs no token to interpret.
 *
 * No `network.allow` entry: the instance host is the app's own allowlist, which
 * is `["*"]` because only the operator knows the address.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_PATH, baseUrlFromConnection } from "../lib/client.ts";

const instance: HealthCheckDefinition = {
  key: "instance",
  title: "Gitea instance reachable",
  description:
    "This connection's own server, via its unauthenticated /api/v1/version endpoint. Sends no " +
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
      res = await ctx.fetch(`${base}${API_PATH}/version`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      // A server that cannot be reached at all IS the failure this check is for.
      return { state: "down", message: `instance unreachable: ${String(err)}` };
    }
    if (!res.ok) {
      // A 404 here is its own diagnosis: something answered, but it is not a
      // Gitea API — usually a wrong URL or a reverse proxy in the way.
      return {
        state: "down",
        message: res.status === 404
          ? `nothing at ${base}${API_PATH}/version (404) — is the instance URL right?`
          : `/api/v1/version returned ${res.status}`,
      };
    }

    const body = await res.json().catch(() => null) as { version?: string } | null;
    if (!body?.version) {
      return { state: "degraded", message: "the version endpoint answered an unexpected shape" };
    }
    return { state: "ok", message: `Gitea ${body.version}`, ttlSeconds: 60 };
  },
};

export default instance;
