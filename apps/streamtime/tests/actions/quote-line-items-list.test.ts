import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import quoteLineItemsList from "../../actions/quote-line-items-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("quote-line-items-list: reads the nested route", async () => {
  const { ctx, calls } = mockCtx([
    { body: [{ id: 1, name: "Design", quantity: "2", unitRate: 120 }] },
  ]);
  const result = await quoteLineItemsList.execute({ quoteId: 201 }, ctx) as {
    quoteLineItems: unknown[];
  };

  assertEquals(pathOf(calls[0].url), "/v2/quotes/201/quote_line_items");
  assertEquals(result.quoteLineItems.length, 1);
});
