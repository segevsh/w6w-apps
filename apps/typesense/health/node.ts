import type { HealthCheckDefinition } from "@w6w/types";
import { hostFromConnection } from "../lib/client.ts";

/**
 * `GET /health` on this connection's own node — and it needs no key.
 *
 * ## An unauthenticated health endpoint is what makes this check honest
 *
 * Most connection-scoped checks in this pack have to be signed, and therefore
 * cannot separate "the server is down" from "the credential was revoked".
 * Typesense's `/health` takes no key, so this reads the node itself and a
 * credential problem cannot masquerade as an outage.
 *
 * ## And it says *why* it is unhealthy
 *
 * Typesense's documentation: when a node is running out of memory or disk, the
 * response carries `resource_error` set to **`OUT_OF_DISK`** or
 * **`OUT_OF_MEMORY`**. That is unusually specific, and it is the difference
 * between "search is broken" and "the disk filled up two days ago".
 *
 * Both states are worth reporting as `degraded` rather than `down`: a node out
 * of memory keeps answering searches and stops accepting writes, so the index
 * goes stale rather than the service going away. That failure is quieter and
 * arguably worse, and nothing else surfaces it.
 */
const check: HealthCheckDefinition = {
  key: "node",
  kind: "dependency",
  scope: "connection",
  credential: "none",
  title: "Typesense node healthy",
  description:
    "Reads this connection's own node through `/health`, which needs NO KEY — so an outage " +
    "cannot be confused with a revoked credential. Reports Typesense's `resource_error`, which " +
    "names OUT_OF_DISK and OUT_OF_MEMORY explicitly.",
  covers: ["dependency", "service"],
  severity: "fatal",
  minIntervalSeconds: 30,
  network: { allow: ["*"] },

  async check(_input, ctx) {
    let host: string;
    try {
      host = hostFromConnection(ctx.connection);
    } catch (err) {
      return { state: "unknown", message: String(err) };
    }

    const started = Date.now();
    let res: Response;
    try {
      res = await ctx.fetch(`${host}/health`, { headers: { accept: "application/json" } });
    } catch (err) {
      return {
        state: "down",
        message: `could not reach ${host}: ${String(err)}. A self-hosted Typesense listens on ` +
          "port 8108 by default, so a bare hostname pointed at 443 fails exactly like this",
        latencyMs: Date.now() - started,
      };
    }
    const latencyMs = Date.now() - started;
    const text = await res.text().catch(() => "");

    interface Health {
      ok?: boolean;
      resource_error?: string;
    }
    let health: Health;
    try {
      health = JSON.parse(text) as Health;
    } catch {
      return {
        state: "degraded",
        message: `${host} answered ${res.status} without JSON — something is responding for the ` +
          "node that is not Typesense, most likely a proxy or a wrong port",
        latencyMs,
      };
    }

    // Out of memory or disk: searches keep working, writes stop, and the index
    // quietly goes stale.
    if (health.resource_error) {
      return {
        state: "degraded",
        message: `the node reports ${health.resource_error} — searches keep answering and WRITES ` +
          "STOP, so the index goes stale rather than the service going away, and nothing else " +
          "reports it",
        latencyMs,
      };
    }
    if (health.ok !== true) {
      return {
        state: "down",
        message: `the node reports itself unhealthy (HTTP ${res.status})`,
        latencyMs,
      };
    }
    if (!res.ok) {
      return { state: "down", message: `the node answered ${res.status}`, latencyMs };
    }

    return { state: "ok", message: `${new URL(host).host} is healthy`, latencyMs };
  },
};

export default check;
