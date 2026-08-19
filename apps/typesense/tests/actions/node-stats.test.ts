import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/node-stats.ts";

const D = { display: { host: "https://search.internal:8108" } };
const stats = {
  status: 200,
  body: {
    total_requests_per_second: 12.5,
    latency_ms: { "/collections/products/documents/search": 3.2 },
    requests_per_second: { "/collections/products/documents/search": 12.5 },
  },
};
const metrics = (usedGb: number) => ({
  status: 200,
  body: {
    system_memory_used_bytes: String(usedGb * 1e9),
    system_memory_total_bytes: "8000000000",
    system_disk_used_bytes: "20000000000",
    system_disk_total_bytes: "100000000000",
    system_cpu_active_percentage: "14",
    typesense_memory_allocated_bytes: "3000000000",
    typesense_memory_fragmentation_ratio: "0.12",
  },
});

Deno.test("node-stats: reads both endpoints and computes the percentages", async () => {
  const { ctx, calls } = mockCtx([stats, metrics(4)], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(calls.map((call) => new URL(call.url).pathname), ["/stats.json", "/metrics.json"]);
  assertEquals(result.requestsPerSecond, 12.5);
  assertEquals(result.memoryUsedPercent, 50);
  assertEquals(result.diskUsedPercent, 20);
  assertEquals(result.cpuActivePercent, 14);
});

/** Typesense's metrics come back as strings. */
Deno.test("node-stats: parses the string-typed metric values", async () => {
  const { ctx } = mockCtx([stats, metrics(4)], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.typesenseMemoryBytes, 3_000_000_000);
  assertEquals(result.fragmentationRatio, 0.12);
});

/** Writes stop and searches carry on, so the index quietly goes stale. */
Deno.test("node-stats: warns near the memory ceiling", async () => {
  const { ctx, logs } = mockCtx([stats, metrics(7.2)], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.memoryUsedPercent, 90);
  assert(
    logs.some((l) => l.level === "warn" && /quietly stopped updating/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("node-stats: a healthy node warns about nothing", async () => {
  const { ctx, logs } = mockCtx([stats, metrics(2)], D);
  await action.execute({}, ctx);
  assertEquals(logs.length, 0);
});

/** A live gauge, not a counter. */
Deno.test("node-stats: says stats.json is a ten-second window", () => {
  assert(/10-SECOND window, not a counter/.test(action.description!), action.description);
  assertEquals(action.params, []);
});
