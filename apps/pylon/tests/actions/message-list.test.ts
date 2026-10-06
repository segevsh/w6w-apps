import { assertEquals } from "@std/assert";
import action from "../../actions/message-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("message-list: GETs /issues/{id}/messages with cursor and limit", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ id: "m1" }], pagination: { cursor: "c2", has_next_page: true } },
  }]);
  const out = await action.execute!({ id: "i1", cursor: "c1", limit: 20 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/issues/i1/messages");
  assertEquals(Object.fromEntries(url.searchParams), { cursor: "c1", limit: "20" });
  assertEquals(out, { messages: [{ id: "m1" }], hasNextPage: true, nextCursor: "c2" });
});

Deno.test("message-list: with no cursor and no limit nothing is sent, so every message returns", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: "m1" }, { id: "m2" }] } }]);
  const out = await action.execute!({ id: "i1" }, ctx);
  assertEquals(calls[0].url, "https://api.usepylon.com/issues/i1/messages");
  assertEquals(out, { messages: [{ id: "m1" }, { id: "m2" }], hasNextPage: false });
});
