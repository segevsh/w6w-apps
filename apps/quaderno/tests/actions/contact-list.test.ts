import { assertEquals } from "@std/assert";
import { mockQuadernoCtx } from "../_helpers.ts";
import action from "../../actions/contact-list.ts";

Deno.test("contact-list: calls the documented endpoint", async () => {
  const { ctx, calls } = mockQuadernoCtx([{
    headers: { "content-type": "application/json", "x-pages-hasmore": "true" },
    body: [{ id: 9 }, { id: 8 }],
  }]);
  const out = await action.execute({ q: "ann", limit: 2 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://acme.quadernoapp.com/api/contacts?q=ann&limit=2");
  assertEquals(out, { items: [{ id: 9 }, { id: 8 }], hasMore: true, nextCursor: 8 });
});
