import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import chatGet from "../../actions/chat-get.ts";
import { mockCtx, ok, pathOf } from "../_helpers.ts";

test("chat-get: GET /chat/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: ok({ chat_id: "c1", transcript: "t" }) }]);
  assertEquals(await chatGet.execute({ chat_id: "c1" }, ctx), { chat_id: "c1", transcript: "t" });
  assertEquals(pathOf(calls[0].url), "/v2/chat/c1");
});
