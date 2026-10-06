import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-simple-price.ts";

Deno.test("get-simple-price: calls the documented path with the mapped query", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { bitcoin: { usd: 1 } } }]);
  const out = await action.execute!({
    vsCurrencies: "usd, eur",
    ids: ["bitcoin", "ethereum"],
    include24hrChange: true,
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd%2Ceur&ids=bitcoin%2Cethereum&include_24hr_change=true",
  );
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
  assert(out !== undefined);
});

Deno.test("get-simple-price: a vendor error body becomes a readable error", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { status: { error_code: 429, error_message: "Rate limit" } },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        vsCurrencies: "usd, eur",
        ids: ["bitcoin", "ethereum"],
        include24hrChange: true,
      }, ctx),
    Error,
    "CoinGecko 429 (error_code 429)",
  );
});

Deno.test("get-simple-price: required input is validated before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ vsCurrencies: "usd" }, ctx),
    Error,
    "required",
  );
  assertEquals(calls.length, 0);
});
