import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-unpin.ts";

Deno.test("message-unpin: targets one message when an id is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, result: true } }]);
  await action.execute({ chatId: "1", messageId: 11 }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { chat_id: "1", message_id: 11 });
});

Deno.test("message-unpin: omits message_id to unpin the most recent pin", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, result: true } }]);
  await action.execute({ chatId: "1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { chat_id: "1" });
});
