import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-categories.ts";

Deno.test("list-categories: calls the documented path with the mapped query", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "layer-1" }] }]);
  const out = await action.execute!({ order: "name_asc" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.coingecko.com/api/v3/coins/categories?order=name_asc");
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
  assert(out !== undefined);
});

Deno.test("list-categories: a vendor error body becomes a readable error", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { status: { error_code: 429, error_message: "Rate limit" } },
  }]);
  await assertRejects(
    async () => await action.execute!({ order: "name_asc" }, ctx),
    Error,
    "CoinGecko 429 (error_code 429)",
  );
});
