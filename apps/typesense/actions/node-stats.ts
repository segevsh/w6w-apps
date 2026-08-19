import type { ActionDefinition } from "@w6w/types";
import { TypesenseClient } from "../lib/client.ts";

/**
 * `GET /stats.json` and `GET /metrics.json` — what this node is doing, and
 * what it has left.
 *
 * ## Typesense holds its index in RAM, so memory is the real capacity
 *
 * Not requests per second, not storage. A Typesense node serves from memory,
 * and the failure when it runs out is `OUT_OF_MEMORY` on `/health` — writes
 * stop, searches keep working, and the first symptom is an index that has
 * quietly stopped updating.
 *
 * So this action reports memory headroom first, and the request rates second.
 * It is the number to alert on before a collection grows into it.
 *
 * ## `stats.json` is a ten-second window
 *
 * Typesense's documentation: this endpoint "returns average requests per
 * second and latencies for all requests in the last 10 seconds". It is a live
 * gauge, not a counter — polling it every minute samples six seconds in every
 * sixty, and totals derived from it are wrong.
 *
 * ## Fragmentation is worth a look on a long-running node
 *
 * `typesense_memory_fragmentation_ratio` is the share of active pages that is
 * wasted. A node that has been indexing and deleting for months can hold
 * substantially more memory than its documents need, and a restart is the
 * remedy that nobody thinks of.
 */
const action: ActionDefinition = {
  key: "node-stats",
  type: "read",
  resource: "node",
  title: "Get node stats",
  description:
    "Request rates, latencies and — the number that matters — MEMORY headroom, because Typesense " +
    "serves from RAM and the failure when it runs out is writes stopping while searches carry " +
    "on. Note stats.json is a live 10-SECOND window, not a counter.",
  params: [],
  output: [
    { key: "requestsPerSecond", type: "number", label: "Across the last ten seconds" },
    { key: "latencyMs", type: "object", label: "Average latency per endpoint" },
    { key: "memoryUsedBytes", type: "number", label: "System RAM in use" },
    { key: "memoryTotalBytes", type: "number", label: "System RAM available" },
    { key: "memoryUsedPercent", type: "number", label: "The number to alert on" },
    { key: "typesenseMemoryBytes", type: "number", label: "What Typesense itself has allocated" },
    { key: "fragmentationRatio", type: "number", label: "Wasted share of active pages" },
    { key: "diskUsedPercent", type: "number", label: "Disk, which holds the write-ahead log" },
    { key: "cpuActivePercent", type: "number", label: "Overall CPU" },
    { key: "endpoints", type: "object", label: "Per-endpoint request rates" },
  ],

  async execute(_input, ctx) {
    const client = new TypesenseClient(ctx);

    const stats = await client.request<{
      latency_ms?: Record<string, number>;
      requests_per_second?: Record<string, number>;
      total_requests_per_second?: number;
    }>("/stats.json");
    const metrics = await client.request<Record<string, string | number>>("/metrics.json");

    const num = (key: string): number | undefined => {
      const value = metrics?.[key];
      if (value === undefined || value === null) return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    const memoryUsed = num("system_memory_used_bytes");
    const memoryTotal = num("system_memory_total_bytes");
    const diskUsed = num("system_disk_used_bytes");
    const diskTotal = num("system_disk_total_bytes");

    const percent = (used?: number, total?: number) =>
      used !== undefined && total ? Math.round((used / total) * 1000) / 10 : undefined;

    const memoryUsedPercent = percent(memoryUsed, memoryTotal);
    if (memoryUsedPercent !== undefined && memoryUsedPercent >= 85) {
      ctx.log(
        "warn",
        "this node is close to its memory ceiling — Typesense serves from RAM, and when it runs " +
          "out writes stop while searches keep working, so the first symptom is an index that " +
          "has quietly stopped updating",
        { memoryUsedPercent },
      );
    }

    return {
      requestsPerSecond: stats?.total_requests_per_second,
      latencyMs: stats?.latency_ms ?? {},
      memoryUsedBytes: memoryUsed,
      memoryTotalBytes: memoryTotal,
      memoryUsedPercent,
      typesenseMemoryBytes: num("typesense_memory_allocated_bytes"),
      // A long-running node can hold much more than its documents need.
      fragmentationRatio: num("typesense_memory_fragmentation_ratio"),
      diskUsedPercent: percent(diskUsed, diskTotal),
      cpuActivePercent: num("system_cpu_active_percentage"),
      endpoints: stats?.requests_per_second ?? {},
    };
  },
};

export default action;
