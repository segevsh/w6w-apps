import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-exchanges.ts";

Deno.test("list-exchanges: calls the documented path with the mapped query", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "binance" }] }]);
  const out = await action.execute!({ perPage: 10, page: 2 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.coingecko.com/api/v3/exchanges?per_page=10&page=2");
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
  assert(out !== undefined);
});

Deno.test("list-exchanges: a vendor error body becomes a readable error", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { status: { error_code: 429, error_message: "Rate limit" } },
  }]);
  await assertRejects(
    async () => await action.execute!({ perPage: 10, page: 2 }, ctx),
    Error,
    "CoinGecko 429 (error_code 429)",
  );
});
