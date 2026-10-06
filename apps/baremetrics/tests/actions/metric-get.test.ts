import { assert, assertEquals } from "@std/assert";
import metricGet from "../../actions/metric-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("metric-get: GET /v1/metrics/mrr with the documented query/body", async () => {
  const { ctx, calls } = mockCtx([{ body: { metrics: [] } }]);
  const out = await metricGet.execute({
    metric: "mrr",
    start_date: "2026-01-01",
    end_date: "2026-01-31",
    compare_to: 5,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/metrics/mrr");
  assertEquals(queryOf(calls[0].url), {
    start_date: "2026-01-01",
    end_date: "2026-01-31",
    compare_to: "5",
  });

  const bare = mockCtx([{ body: {} }]);
  await metricGet.execute(
    { metric: "mrr", start_date: "2026-01-01", end_date: "2026-01-31" },
    bare.ctx,
  );
  assertEquals(
    queryOf(bare.calls[0].url),
    { start_date: "2026-01-01", end_date: "2026-01-31" },
    "unset optional params must not reach the query",
  );
  assertEquals(calls[0].body, null);
  assert("metrics" in out);
});

Deno.test("metric-get: declares type read and every required param", () => {
  assertEquals(metricGet.type, "read");
  const required = (metricGet.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["end_date", "metric", "start_date"]);
});

Deno.test("metric-get: surfaces a vendor error as a thrown message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Unauthorized. API Key not found (001)" },
  }]);
  let message = "";
  try {
    await metricGet.execute({
      metric: "mrr",
      start_date: "2026-01-01",
      end_date: "2026-01-31",
      compare_to: 5,
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("401") && message.includes("Unauthorized"), message);
});
