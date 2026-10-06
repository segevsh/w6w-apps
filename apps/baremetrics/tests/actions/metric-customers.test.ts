import { assert, assertEquals } from "@std/assert";
import metricCustomers from "../../actions/metric-customers.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("metric-customers: GET /v1/metrics/mrr/customers with the documented query/body", async () => {
  const { ctx, calls } = mockCtx([{ body: { customers: [] } }]);
  const out = await metricCustomers.execute({
    metric: "mrr",
    start_date: "2026-01-01",
    end_date: "2026-01-31",
    per_page: 5,
    page: 5,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/metrics/mrr/customers");
  assertEquals(queryOf(calls[0].url), {
    start_date: "2026-01-01",
    end_date: "2026-01-31",
    per_page: "5",
    page: "5",
  });

  const bare = mockCtx([{ body: {} }]);
  await metricCustomers.execute(
    { metric: "mrr", start_date: "2026-01-01", end_date: "2026-01-31" },
    bare.ctx,
  );
  assertEquals(
    queryOf(bare.calls[0].url),
    { start_date: "2026-01-01", end_date: "2026-01-31" },
    "unset optional params must not reach the query",
  );
  assertEquals(calls[0].body, null);
  assert("customers" in out);
});

Deno.test("metric-customers: declares type search and every required param", () => {
  assertEquals(metricCustomers.type, "search");
  const required = (metricCustomers.params ?? []).filter((p) => p.required).map((p) => p.key)
    .sort();
  assertEquals(required, ["end_date", "metric", "start_date"]);
});

Deno.test("metric-customers: surfaces a vendor error as a thrown message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Unauthorized. API Key not found (001)" },
  }]);
  let message = "";
  try {
    await metricCustomers.execute({
      metric: "mrr",
      start_date: "2026-01-01",
      end_date: "2026-01-31",
      per_page: 5,
      page: 5,
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("401") && message.includes("Unauthorized"), message);
});
