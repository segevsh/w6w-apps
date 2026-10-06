import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-category-ids.ts";

Deno.test("list-category-ids: calls the documented path with the mapped query", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ category_id: "layer-1" }] }]);
  const out = await action.execute!({}, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.coingecko.com/api/v3/coins/categories/list");
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
  assert(out !== undefined);
});

Deno.test("list-category-ids: a vendor error body becomes a readable error", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { status: { error_code: 429, error_message: "Rate limit" } },
  }]);
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "CoinGecko 429 (error_code 429)",
  );
});
