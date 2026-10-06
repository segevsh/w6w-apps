import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-coin-history.ts";

Deno.test("get-coin-history: calls the documented path with the mapped query", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "bitcoin" } }]);
  const out = await action.execute!({ id: "bitcoin", date: "30-12-2024" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.coingecko.com/api/v3/coins/bitcoin/history?date=30-12-2024",
  );
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
  assert(out !== undefined);
});

Deno.test("get-coin-history: a vendor error body becomes a readable error", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { status: { error_code: 429, error_message: "Rate limit" } },
  }]);
  await assertRejects(
    async () => await action.execute!({ id: "bitcoin", date: "30-12-2024" }, ctx),
    Error,
    "CoinGecko 429 (error_code 429)",
  );
});

Deno.test("get-coin-history: required input is validated before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({ id: "bitcoin" }, ctx), Error, "required");
  assertEquals(calls.length, 0);
});
