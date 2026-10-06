import { assert, assertEquals } from "@std/assert";
import metricPlans from "../../actions/metric-plans.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("metric-plans: GET /v1/metrics/mrr/plans with the documented query/body", async () => {
  const { ctx, calls } = mockCtx([{ body: { plans: [] } }]);
  const out = await metricPlans.execute({
    metric: "mrr",
    start_date: "2026-01-01",
    end_date: "2026-01-31",
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/metrics/mrr/plans");
  assertEquals(queryOf(calls[0].url), { start_date: "2026-01-01", end_date: "2026-01-31" });

  const bare = mockCtx([{ body: {} }]);
  await metricPlans.execute(
    { metric: "mrr", start_date: "2026-01-01", end_date: "2026-01-31" },
    bare.ctx,
  );
  assertEquals(
    queryOf(bare.calls[0].url),
    { start_date: "2026-01-01", end_date: "2026-01-31" },
    "unset optional params must not reach the query",
  );
  assertEquals(calls[0].body, null);
  assert("plans" in out);
});

Deno.test("metric-plans: declares type read and every required param", () => {
  assertEquals(metricPlans.type, "read");
  const required = (metricPlans.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["end_date", "metric", "start_date"]);
});

Deno.test("metric-plans: surfaces a vendor error as a thrown message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Unauthorized. API Key not found (001)" },
  }]);
  let message = "";
  try {
    await metricPlans.execute(
      { metric: "mrr", start_date: "2026-01-01", end_date: "2026-01-31" },
      ctx,
    );
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("401") && message.includes("Unauthorized"), message);
});
