import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-coins.ts";

Deno.test("list-coins: calls the documented path with the mapped query", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "bitcoin" }] }]);
  const out = await action.execute!({ includePlatform: true, status: "inactive" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.coingecko.com/api/v3/coins/list?include_platform=true&status=inactive",
  );
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
  assert(out !== undefined);
});

Deno.test("list-coins: a vendor error body becomes a readable error", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { status: { error_code: 429, error_message: "Rate limit" } },
  }]);
  await assertRejects(
    async () => await action.execute!({ includePlatform: true, status: "inactive" }, ctx),
    Error,
    "CoinGecko 429 (error_code 429)",
  );
});
