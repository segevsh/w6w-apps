import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/card-get.ts";

test("card-get: GETs /cards/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  await action.execute({ id: "c1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/1/cards/c1");
});
