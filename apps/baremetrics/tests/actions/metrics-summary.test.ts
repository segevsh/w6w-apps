import { assert, assertEquals } from "@std/assert";
import metricsSummary from "../../actions/metrics-summary.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("metrics-summary: GET /v1/metrics with the documented query/body", async () => {
  const { ctx, calls } = mockCtx([{ body: { metrics: [] } }]);
  const out = await metricsSummary.execute(
    { start_date: "2026-01-01", end_date: "2026-01-31" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/metrics");
  assertEquals(queryOf(calls[0].url), { start_date: "2026-01-01", end_date: "2026-01-31" });

  const bare = mockCtx([{ body: {} }]);
  await metricsSummary.execute({ start_date: "2026-01-01", end_date: "2026-01-31" }, bare.ctx);
  assertEquals(
    queryOf(bare.calls[0].url),
    { start_date: "2026-01-01", end_date: "2026-01-31" },
    "unset optional params must not reach the query",
  );
  assertEquals(calls[0].body, null);
  assert("metrics" in out);
});

Deno.test("metrics-summary: declares type read and every required param", () => {
  assertEquals(metricsSummary.type, "read");
  const required = (metricsSummary.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["end_date", "start_date"]);
});

Deno.test("metrics-summary: surfaces a vendor error as a thrown message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Unauthorized. API Key not found (001)" },
  }]);
  let message = "";
  try {
    await metricsSummary.execute({ start_date: "2026-01-01", end_date: "2026-01-31" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("401") && message.includes("Unauthorized"), message);
});
