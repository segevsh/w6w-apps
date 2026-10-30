import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import chatSendMessage from "../../actions/chat-send-message.ts";
import { mockCtx, ok, pathOf } from "../_helpers.ts";

test("chat-send-message: POST /chat/{id}/messages", async () => {
  const { ctx, calls } = mockCtx([{ body: ok({ agent_message: "hello", turn_number: 1 }) }]);
  const out = await chatSendMessage.execute({ chat_id: "c1", message: "hi" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/chat/c1/messages");
  assertEquals(JSON.parse(calls[0].body!), { message: "hi" });
  assertEquals(out, { agent_message: "hello", turn_number: 1 });
});
