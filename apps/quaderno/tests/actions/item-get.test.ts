import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockQuadernoCtx } from "../_helpers.ts";
import action from "../../actions/item-get.ts";

test("item-get: calls the documented endpoint", async () => {
  const { ctx, calls } = mockQuadernoCtx([{ body: { id: 12 } }]);
  const out = await action.execute({ id: 12 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://acme.quadernoapp.com/api/items/12");
  assertEquals(out, { id: 12 });
});
