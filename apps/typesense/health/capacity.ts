import type { HealthCheckDefinition } from "@w6w/types";
import { hostFromConnection } from "../lib/client.ts";

/**
 * Memory and disk headroom, read from `/metrics.json`.
 *
 * ## Typesense's quota is RAM, and this is the rare case where it can be read
 *
 * Most apps in this pack declare their quota check unavailable because the
 * vendor publishes no rate-limit header. Typesense publishes something better:
 * the actual resource that runs out. It serves its index **from memory**, so
 * the ceiling is not requests per second — it is how much RAM the node has
 * left, and the failure when it is gone is writes being refused while searches
 * carry on answering.
 *
 * That failure mode is why this is worth checking rather than waiting for
 * `/health` to report `OUT_OF_MEMORY`: by then the index has already stopped
 * updating, and a stale index answers questions confidently.
 *
 * ## Disk matters too, for a different reason
 *
 * Typesense keeps a write-ahead log on disk. A full disk stops writes even
 * when memory is fine, and it is the failure that arrives without warning
 * because nothing about search performance degrades first.
 *
 * ## This one needs the credential
 *
 * Unlike `/health`, `/metrics.json` is authenticated — so unlike the `node`
 * check, a rejected credential here cannot be told apart from an outage. That
 * is why it is `degraded` at worst: `node` is the check that decides whether
 * the connection is working.
 */
const check: HealthCheckDefinition = {
  key: "capacity",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  title: "Memory and disk headroom",
  description:
    "Typesense serves its index from RAM, so its quota is MEMORY rather than a request rate — " +
    "and unusually, the real figure is readable. Warns before `/health` reports OUT_OF_MEMORY, " +
    "because by then writes have already stopped and the index is going stale.",
  covers: ["quota"],
  severity: "degraded",
  minIntervalSeconds: 120,
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
      res = await ctx.fetch(`${host}/metrics.json`, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "unknown", message: `could not reach ${host}: ${String(err)}` };
    }
    const latencyMs = Date.now() - started;
    if (!res.ok) {
      // Authenticated, so this cannot separate an outage from a bad key.
      return {
        state: "unknown",
        message: `/metrics.json answered ${res.status} — unlike /health this endpoint needs the ` +
          "key, so a rejected credential and an outage look the same here. The `node` check is " +
          "the one that decides",
        latencyMs,
      };
    }

    let metrics: Record<string, string | number>;
    try {
      metrics = await res.json() as Record<string, string | number>;
    } catch {
      return { state: "unknown", message: "/metrics.json did not return JSON", latencyMs };
    }

    const num = (key: string): number | undefined => {
      const parsed = Number(metrics?.[key]);
      return Number.isFinite(parsed) ? parsed : undefined;
    };
    const share = (used?: number, total?: number) =>
      used !== undefined && total ? Math.round((used / total) * 1000) / 10 : undefined;

    const memory = share(num("system_memory_used_bytes"), num("system_memory_total_bytes"));
    const disk = share(num("system_disk_used_bytes"), num("system_disk_total_bytes"));

    if (memory === undefined && disk === undefined) {
      return {
        state: "unknown",
        message: "/metrics.json carried neither memory nor disk figures",
        latencyMs,
      };
    }

    const parts = [
      memory !== undefined ? `memory ${memory}%` : undefined,
      disk !== undefined ? `disk ${disk}%` : undefined,
    ].filter(Boolean).join(", ");

    if ((memory ?? 0) >= 90) {
      return {
        state: "degraded",
        message: `${parts} — at the memory ceiling Typesense refuses WRITES and keeps answering ` +
          "searches, so the index stops updating while everything looks healthy",
        latencyMs,
      };
    }
    if ((disk ?? 0) >= 90) {
      return {
        state: "degraded",
        message: `${parts} — a full disk stops writes even with memory to spare, and nothing ` +
          "about search performance degrades first",
        latencyMs,
      };
    }
    if ((memory ?? 0) >= 80 || (disk ?? 0) >= 80) {
      return { state: "degraded", message: `${parts} — worth watching`, latencyMs };
    }

    return { state: "ok", message: parts, latencyMs };
  },
};

export default check;
