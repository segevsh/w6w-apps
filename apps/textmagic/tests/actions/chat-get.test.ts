import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import chatGet from "../../actions/chat-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("chat-get: GETs /chats/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 43328, phone: "447860021130" } }]);
  const out = await chatGet.execute({ id: 43328 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/chats/43328");
  assertEquals(out, { id: 43328, phone: "447860021130" });
});
