import { assertEquals } from "@std/assert";
import { mockQuadernoCtx } from "../_helpers.ts";
import action from "../../actions/item-list.ts";

Deno.test("item-list: calls the documented endpoint", async () => {
  const { ctx, calls } = mockQuadernoCtx([{ body: [{ id: 2, code: "PLAN" }] }]);
  const out = await action.execute({ q: "plan" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://acme.quadernoapp.com/api/items?q=plan");
  assertEquals(out, { items: [{ id: 2, code: "PLAN" }], hasMore: false, nextCursor: undefined });
});
