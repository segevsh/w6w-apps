import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/quote-delete.ts";

test("quote-delete: DELETEs /quotes/{id}", async () => {
  const { ctx, calls } = mockNinjaCtx([{ status: 204 }]);
  const out = await action.execute({ quoteId: "q1" }, ctx);
  assertEquals(calls[0].url, "https://acme.invoicing.co/api/v1/quotes/q1");
  assertEquals(out, {});
});
