import { assertEquals } from "@std/assert";
import quoteGet from "../../actions/quote-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("quote-get: reads GET /v2/quotes/{id}", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: 201, quoteName: "Website Redesign", quoteCurrencyTotalAmountExTax: 5000 } },
  ]);
  const result = await quoteGet.execute({ quoteId: 201 }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2/quotes/201");
  assertEquals(result.quoteCurrencyTotalAmountExTax, 5000);
});

/** There is no `GET /quotes` list on this API. */
Deno.test("quote-get: the hint points at search, because there is no list route", () => {
  assertEquals(/search over `quotes`/.test(quoteGet.params?.[0].hint ?? ""), true);
});
