import type { HealthCheckDefinition } from "@w6w/types";
import { hostFromConnection } from "../lib/client.ts";

/**
 * `GET /api/v1/health` on this connection's own NocoDB — unauthenticated, and
 * it reports the process's uptime.
 *
 * ## An unauthenticated probe means an outage cannot hide behind a 401
 *
 * Verified live: the endpoint answers `{"message":"OK","timestamp":…,
 * "uptime":63296.5}` with no credential at all. So this reads the server
 * itself, and a revoked token cannot present as an outage.
 *
 * ## The uptime is the interesting field
 *
 * Most health endpoints say "fine". This one says how long the process has
 * been running — and on a self-hosted NocoDB, which is most of them, a
 * repeatedly small uptime is a container **crash-looping**. Every individual
 * check passes; the pattern is the failure, and nothing else in the API would
 * show it.
 *
 * A server that has been up for two minutes is reported as such rather than as
 * healthy, because a workflow seeing intermittent failures against a service
 * that keeps restarting deserves the connection.
 *
 * ## It is a v1 path, deliberately
 *
 * The data and metadata APIs are v2; health is still v1 and answers on every
 * version of NocoDB anybody is running, which is what a health check wants.
 */
const check: HealthCheckDefinition = {
  key: "instance",
  kind: "dependency",
  scope: "connection",
  credential: "none",
  title: "NocoDB instance healthy",
  description:
    "Reads this connection's own server through the UNAUTHENTICATED `/api/v1/health`, so an " +
    "outage cannot hide behind a credential problem. Reports the process UPTIME, because a " +
    "repeatedly small one is a container crash-looping — a pattern no single check would show.",
  covers: ["dependency", "service"],
  severity: "fatal",
  minIntervalSeconds: 60,
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
      res = await ctx.fetch(`${host}/api/v1/health`, { headers: { accept: "application/json" } });
    } catch (err) {
      return {
        state: "down",
        message: `could not reach ${host}: ${String(err)}`,
        latencyMs: Date.now() - started,
      };
    }
    const latencyMs = Date.now() - started;
    const text = await res.text().catch(() => "");

    if (!res.ok) {
      return {
        state: res.status >= 500 ? "down" : "degraded",
        message: `${host} answered ${res.status} to an unauthenticated health check`,
        latencyMs,
      };
    }

    interface Health {
      message?: string;
      uptime?: number;
    }
    let health: Health;
    try {
      health = JSON.parse(text) as Health;
    } catch {
      return {
        state: "degraded",
        message: `${host} answered without JSON — something is responding for NocoDB that is ` +
          "not NocoDB, most likely a proxy or a login page",
        latencyMs,
      };
    }

    if (health.message !== "OK") {
      return {
        state: "down",
        message: `the instance reports ${health.message ?? "no status"}`,
        latencyMs,
      };
    }

    // A short uptime, seen repeatedly, is a process that keeps dying.
    const uptime = Number(health.uptime ?? 0);
    if (Number.isFinite(uptime) && uptime > 0 && uptime < 300) {
      return {
        state: "degraded",
        message:
          `the instance is answering and has been running for only ${
            Math.round(uptime)
          } seconds — if that stays small between checks the process is restarting, and every ` +
          "individual check will keep passing",
        latencyMs,
      };
    }

    return {
      state: "ok",
      message: `${new URL(host).host} is healthy` +
        (uptime ? `, up ${Math.round(uptime / 3600)}h` : ""),
      latencyMs,
    };
  },
};

export default check;
