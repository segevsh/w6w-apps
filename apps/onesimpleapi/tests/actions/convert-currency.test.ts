import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/convert-currency.ts";

Deno.test("convert-currency: GETs /exchange_rate with to_currency required", async () => {
  const body = {
    from_currency: "USD",
    from_value: 1,
    to_currency: "GBP",
    to_value: 0.79,
    to_exchange_rate: 0.79,
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ toCurrency: "GBP" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/exchange_rate");
  assertEquals(url.searchParams.get("to_currency"), "GBP");
  assertEquals(url.searchParams.has("from_currency"), false);
  assertEquals(url.searchParams.has("from_value"), false);
  assertEquals(result, body);
});

Deno.test("convert-currency: forwards fromCurrency/fromValue when provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { to_value: 1 } }]);
  await action.execute!({ toCurrency: "GBP", fromCurrency: "EUR", fromValue: 235 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("from_currency"), "EUR");
  assertEquals(url.searchParams.get("from_value"), "235");
});
