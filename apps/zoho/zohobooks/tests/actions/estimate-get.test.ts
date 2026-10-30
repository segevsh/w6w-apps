import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockBooksCtx } from "../_helpers.ts";
import action from "../../actions/estimate-get.ts";

test("estimate-get: GETs /estimates/{id}", async () => {
  const { ctx, calls } = mockBooksCtx([
    { body: { code: 0, message: "success", estimate: { estimate_id: "1" } } },
  ]);
  const out = await action.execute({ recordId: "1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/books/v3/estimates/1");
  assertEquals(out, { estimate_id: "1" });
});
