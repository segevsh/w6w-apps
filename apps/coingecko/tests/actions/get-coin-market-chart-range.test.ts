import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-coin-market-chart-range.ts";

Deno.test("get-coin-market-chart-range: calls the documented path with the mapped query", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { prices: [[1, 2]] } }]);
  const out = await action.execute!({
    id: "bitcoin",
    vsCurrency: "usd",
    from: "2025-01-01",
    to: "2025-02-01",
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from=2025-01-01&to=2025-02-01",
  );
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
  assert(out !== undefined);
});

Deno.test("get-coin-market-chart-range: a vendor error body becomes a readable error", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { status: { error_code: 429, error_message: "Rate limit" } },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        id: "bitcoin",
        vsCurrency: "usd",
        from: "2025-01-01",
        to: "2025-02-01",
      }, ctx),
    Error,
    "CoinGecko 429 (error_code 429)",
  );
});

Deno.test("get-coin-market-chart-range: required input is validated before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await action.execute!({ id: "bitcoin", vsCurrency: "usd", from: "2025-01-01" }, ctx),
    Error,
    "required",
  );
  assertEquals(calls.length, 0);
});
