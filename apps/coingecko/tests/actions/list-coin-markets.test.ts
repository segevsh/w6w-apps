import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-coin-markets.ts";

Deno.test("list-coin-markets: calls the documented path with the mapped query", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "bitcoin" }] }]);
  const out = await action.execute!({
    vsCurrency: "usd",
    perPage: 2,
    page: 3,
    order: "volume_desc",
    priceChangePercentage: "1h,24h",
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=volume_desc&per_page=2&page=3&price_change_percentage=1h%2C24h",
  );
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
  assert(out !== undefined);
});

Deno.test("list-coin-markets: a vendor error body becomes a readable error", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { status: { error_code: 429, error_message: "Rate limit" } },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        vsCurrency: "usd",
        perPage: 2,
        page: 3,
        order: "volume_desc",
        priceChangePercentage: "1h,24h",
      }, ctx),
    Error,
    "CoinGecko 429 (error_code 429)",
  );
});

Deno.test("list-coin-markets: required input is validated before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "required");
  assertEquals(calls.length, 0);
});
