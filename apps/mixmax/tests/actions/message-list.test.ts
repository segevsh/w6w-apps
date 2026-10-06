import { assertEquals } from "@std/assert";
import action from "../../actions/message-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("message-list: GET /messages?limit=2", async () => {
  const { ctx, calls } = mockCtx([{
    body: { results: [{ _id: "m1" }], next: "abc", hasNext: true },
  }]);
  const out = await action.execute!({ limit: 2 } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.mixmax.com/v1/messages?limit=2");
  assertEquals(calls[0].body, null);
  assertEquals(out, { results: [{ _id: "m1" }], next: "abc", hasNext: true });
});
