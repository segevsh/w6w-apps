import { assertEquals } from "@std/assert";
import { mockQuadernoCtx } from "../_helpers.ts";
import action from "../../actions/estimate-list.ts";

Deno.test("estimate-list: calls the documented endpoint", async () => {
  const { ctx, calls } = mockQuadernoCtx([{ body: [{ id: 1 }] }]);
  const out = await action.execute({ state: "paid", contactId: 3 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://acme.quadernoapp.com/api/proformas?state=paid&contact=3");
  assertEquals(out, { items: [{ id: 1 }], hasMore: false, nextCursor: undefined });
});
