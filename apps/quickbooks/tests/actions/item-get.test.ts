import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockQuickBooksCtx } from "../_helpers.ts";
import action from "../../actions/item-get.ts";

test("item-get: GETs /item/{id}", async () => {
  const { ctx, calls } = mockQuickBooksCtx([{ body: { Item: { Id: "1" } } }]);
  await action.execute({ itemId: "1" }, ctx);
  assertEquals(
    calls[0].url,
    "https://quickbooks.api.intuit.com/v3/company/123145/item/1?minorversion=75",
  );
});
