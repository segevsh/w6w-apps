/**
 * Is **this connection's** Meilisearch reachable? — the instance's own
 * `/health`.
 *
 * This is the check that matters for a self-hosted app, and it is a different
 * question from "is the vendor up". The server is the operator's: it can be a
 * Cloud project, a container on a laptop, or a box behind a VPN that a status
 * page has never heard of. Meilisearch publishes `GET /health` for exactly
 * this, unauthenticated, returning `{"status":"available"}`.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "dependency"` — "is the thing this Connection points at
 *     reachable", not "is the vendor's platform up" (`service`) and not "is the
 *     credential live" (the derived `auth:*` check). Twenty-five other apps in
 *     this pack draw the same distinction, for the same reason: "the site is
 *     gone" and "the token expired" have different fixes.
 *   - `scope: "connection"` — every Connection points at a different server, so
 *     there is nothing to share between them.
 *   - `credential: "context"` — the Connection supplies the URL, and `/health`
 *     needs no key to interpret. Reading it unsigned also means a key that has
 *     expired does not make the server look down.
 *   - `severity` defaults to `degraded` for this kind. An unreachable instance
 *     genuinely should move the verdict.
 *
 * No `network.allow` entry: the instance host is the app's own allowlist, which
 * is `["*"]` because only the operator knows the address.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { baseUrlFromConnection } from "../lib/client.ts";

const instance: HealthCheckDefinition = {
  key: "instance",
  title: "Meilisearch instance reachable",
  description: "This connection's own server, via its unauthenticated /health endpoint. Sends no " +
    "credential — an expired key must not make the server look down.",
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
    if (!res.ok) {
      return { state: "down", message: `/health returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as { status?: string } | null;
    // Meilisearch answers `{"status":"available"}` when it is ready to serve.
    if (body?.status === "available") {
      return { state: "ok", message: "available", ttlSeconds: 60 };
    }
    return {
      state: "degraded",
      message: `/health answered ${body?.status ?? "an unexpected shape"}`,
    };
  },
};

export default instance;
